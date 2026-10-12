import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { HttpApiClient } from "./client";
import { server } from "@/test/server";
import { TEST_API_BASE } from "@/test/handlers";
import { makeRawVideo } from "@/test/factories";

const client = new HttpApiClient(TEST_API_BASE);

describe("ApiClient.listVideos（contract C2 / GET /video）", () => {
  it("配列レスポンスを ok(Video[]) に正規化する", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/video`, () =>
        HttpResponse.json([makeRawVideo(), makeRawVideo({ video_id: "v2" })]),
      ),
    );
    const result = await client.listVideos({ uploadStatus: "complete" });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].videoId).toBe("v1");
    }
  });

  it("空配列は empty に正規化する", async () => {
    server.use(http.get(`${TEST_API_BASE}/video`, () => HttpResponse.json([])));
    const result = await client.listVideos({ uploadStatus: "complete" });
    expect(result.kind).toBe("empty");
  });

  it("ネットワーク断は transport 失敗に正規化する（error-path）", async () => {
    server.use(http.get(`${TEST_API_BASE}/video`, () => HttpResponse.error()));
    const result = await client.listVideos({ uploadStatus: "complete" });
    expect(result.kind).toBe("transport");
  });

  it("非配列レスポンスは transport 失敗に正規化する（error-path）", async () => {
    server.use(http.get(`${TEST_API_BASE}/video`, () => HttpResponse.json({ result: "error" })));
    const result = await client.listVideos({ uploadStatus: "complete" });
    expect(result.kind).toBe("transport");
  });

  it("スキーマ不一致の item を含む配列は transport 失敗に正規化する（error-path）", async () => {
    server.use(http.get(`${TEST_API_BASE}/video`, () => HttpResponse.json([{ video_id: 123 }])));
    const result = await client.listVideos({ uploadStatus: "complete" });
    expect(result.kind).toBe("transport");
  });

  it("upload_status と fetch_num をクエリに整形する", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${TEST_API_BASE}/video`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json([]);
      }),
    );
    await client.listVideos({ uploadStatus: "init", fetchNum: 50 });
    expect(capturedUrl).toContain("upload_status=init");
    expect(capturedUrl).toContain("fetch_num=50");
  });
});

describe("ApiClient.getVideo（VideoEnvelope）", () => {
  it("succ + video_data を ok(Video) に正規化する", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/video/:id`, () =>
        HttpResponse.json({ result: "succ", description: "ok", video_data: makeRawVideo() }),
      ),
    );
    const result = await client.getVideo("v1");
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.data.videoId).toBe("v1");
    }
  });

  it("未存在（Dynamoに情報がない）は notFound に正規化する（error-path）", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/video/:id`, () =>
        HttpResponse.json({
          result: "error",
          description: "Dynamoに情報がない",
          video_data: null,
        }),
      ),
    );
    const result = await client.getVideo("missing");
    expect(result.kind).toBe("notFound");
  });

  it("video_id 未指定は invalidInput に正規化する（error-path）", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/video/:id`, () =>
        HttpResponse.json({
          result: "error",
          description: "video_idを指定してください",
          video_data: null,
        }),
      ),
    );
    const result = await client.getVideo(" ");
    expect(result.kind).toBe("invalidInput");
  });
});

describe("ApiClient.submitVideo（SubmitEnvelope / POST /video）", () => {
  it("新規登録を ok(SubmitResult) に正規化する", async () => {
    server.use(
      http.post(`${TEST_API_BASE}/video`, () =>
        HttpResponse.json({
          result: "succ",
          description: "バックアップ処理開始",
          video_data: {
            video_id: "v9",
            title: "新規",
            already_backup: false,
            batch_job_id: "job-1",
            s3: "s3://example-bucket/v9.mp4",
          },
        }),
      ),
    );
    const result = await client.submitVideo("https://youtu.be/abc");
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.data.alreadyBackedUp).toBe(false);
      expect(result.data.batchJobId).toBe("job-1");
    }
  });

  it("既登録（already_backup=true）も ok(alreadyBackedUp:true) に正規化する", async () => {
    server.use(
      http.post(`${TEST_API_BASE}/video`, () =>
        HttpResponse.json({
          result: "succ",
          description: "バックアップ済み",
          video_data: {
            video_id: "v9",
            title: "既存",
            already_backup: true,
            batch_job_id: "",
            s3: "s3://example-bucket/v9.mp4",
          },
        }),
      ),
    );
    const result = await client.submitVideo("https://youtu.be/abc");
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.data.alreadyBackedUp).toBe(true);
    }
  });

  it("URLの異常は invalidInput に正規化する（error-path）", async () => {
    server.use(
      http.post(`${TEST_API_BASE}/video`, () =>
        HttpResponse.json({ result: "error", description: "URLの異常", video_data: null }),
      ),
    );
    const result = await client.submitVideo("bad");
    expect(result.kind).toBe("invalidInput");
  });
});

describe("ApiClient.deleteVideo（DELETE /video/{id}）", () => {
  it("成功を ok(Video) に正規化する", async () => {
    server.use(
      http.delete(`${TEST_API_BASE}/video/:id`, () =>
        HttpResponse.json({ result: "succ", description: "deleted", video_data: makeRawVideo() }),
      ),
    );
    const result = await client.deleteVideo("v1");
    expect(result.kind).toBe("ok");
  });

  it("バックアップ中の削除拒否は rejected(backupInProgress) に正規化する（error-path）", async () => {
    server.use(
      http.delete(`${TEST_API_BASE}/video/:id`, () =>
        HttpResponse.json({
          result: "error",
          description: "(バックアップ中)Dynamoに登録されているがS3に存在しません。",
          video_data: null,
        }),
      ),
    );
    const result = await client.deleteVideo("v1");
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.reason).toBe("backupInProgress");
    }
  });

  it("分類不能な error は rejected(serverError) に正規化する（error-path）", async () => {
    server.use(
      http.delete(`${TEST_API_BASE}/video/:id`, () =>
        HttpResponse.json({
          result: "error",
          description: "S3削除に失敗しました",
          video_data: null,
        }),
      ),
    );
    const result = await client.deleteVideo("v1");
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.reason).toBe("serverError");
    }
  });
});

describe("ApiClient.getPresignedUrl（PresignedEnvelope）", () => {
  it("成功を ok(url) に正規化する", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/presigned-s3url`, () =>
        HttpResponse.json({
          result: "succ",
          description: "ok",
          presigned_s3url: "https://s3.example.com/signed",
        }),
      ),
    );
    const result = await client.getPresignedUrl("v1");
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.data).toContain("https://");
    }
  });

  it("未存在は notFound に正規化する（error-path）", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/presigned-s3url`, () =>
        HttpResponse.json({
          result: "error",
          description: "Dynamoに情報がない",
          presigned_s3url: null,
        }),
      ),
    );
    const result = await client.getPresignedUrl("missing");
    expect(result.kind).toBe("notFound");
  });
});

describe("ApiClient.request のヘッダ制御（CORS preflight 回避）", () => {
  it("ボディを持たない GET /presigned-s3url には Content-Type を付けない（単純リクエスト）", async () => {
    let contentType: string | null = "unset";
    server.use(
      http.get(`${TEST_API_BASE}/presigned-s3url`, ({ request }) => {
        contentType = request.headers.get("content-type");
        return HttpResponse.json({
          result: "succ",
          description: "ok",
          presigned_s3url: "https://s3.example.com/signed",
        });
      }),
    );
    await client.getPresignedUrl("v1");
    expect(contentType).toBeNull();
  });

  it("ボディを持たない DELETE /video/{id} には Content-Type を付けない", async () => {
    let contentType: string | null = "unset";
    server.use(
      http.delete(`${TEST_API_BASE}/video/:id`, ({ request }) => {
        contentType = request.headers.get("content-type");
        return HttpResponse.json({
          result: "succ",
          description: "deleted",
          video_data: makeRawVideo(),
        });
      }),
    );
    await client.deleteVideo("v1");
    expect(contentType).toBeNull();
  });

  it("ボディを持つ POST /video には Content-Type: application/json を付ける", async () => {
    let contentType: string | null = null;
    server.use(
      http.post(`${TEST_API_BASE}/video`, ({ request }) => {
        contentType = request.headers.get("content-type");
        return HttpResponse.json({ result: "error", description: "URLの異常", video_data: null });
      }),
    );
    await client.submitVideo("bad");
    expect(contentType).toBe("application/json");
  });
});
