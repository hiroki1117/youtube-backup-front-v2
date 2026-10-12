import { z } from "zod";
import { parseVideo, type UploadStatus, type Video } from "@/types/video";
import { config } from "./config";

/**
 * ApiClient インターフェース契約（contract C2）。
 * 唯一の HTTP 境界。外部 API の 3 形状不統一・エラー常時 HTTP 200 を吸収し、
 * 消費側へは discriminated union の型付き失敗値（ApiResult<T>）のみを渡す（例外を投げない）。
 * 認証ヘッダは付与しない（バックエンド未認証。特に /presigned-s3url は preflight 回避）。
 */

export type ApiResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "empty" } // 該当なし（例: 一覧 0 件）
  | { kind: "notFound"; message: string } // result=error かつ未存在系
  | { kind: "rejected"; reason: RejectReason; message: string } // 業務ルール上の拒否
  | { kind: "invalidInput"; message: string } // URL/ID 不正・未指定
  | { kind: "transport"; message: string }; // ネットワーク/パース失敗

export type RejectReason = "backupInProgress" | "alreadyBackedUp" | "serverError";

export interface SubmitResult {
  videoId: string;
  title: string;
  alreadyBackedUp: boolean;
  batchJobId: string;
}

export interface ApiClient {
  listVideos(params: {
    uploadStatus: UploadStatus;
    fetchNum?: number;
  }): Promise<ApiResult<Video[]>>;
  getVideo(videoId: string): Promise<ApiResult<Video>>;
  submitVideo(url: string): Promise<ApiResult<SubmitResult>>;
  deleteVideo(videoId: string): Promise<ApiResult<Video>>;
  getPresignedUrl(videoId: string): Promise<ApiResult<string>>;
}

// result=error 時に返る失敗バリアント（ok/empty を除く）。
type ApiFailure = Extract<
  ApiResult<never>,
  { kind: "notFound" } | { kind: "rejected" } | { kind: "invalidInput" } | { kind: "transport" }
>;

const resultFlag = z.union([z.literal("succ"), z.literal("error")]);

const submitEnvelopeSchema = z.object({
  result: resultFlag,
  description: z.string(),
  video_data: z
    .object({
      video_id: z.string(),
      title: z.string(),
      already_backup: z.boolean(),
      batch_job_id: z.string(),
      s3: z.string(),
    })
    .nullable()
    .optional(),
});

const videoEnvelopeSchema = z.object({
  result: resultFlag,
  description: z.string(),
  video_data: z.unknown().nullable().optional(),
});

const presignedEnvelopeSchema = z.object({
  result: resultFlag,
  description: z.string(),
  presigned_s3url: z.string().nullable().optional(),
});

type RawFetch = { ok: true; body: unknown } | { ok: false; message: string };

/**
 * error result の description 文字列を ApiResult の失敗種別へ正規化する（C2 実装契約）。
 * 制御分岐は description の内容で行う（既存 API はエラーも HTTP 200 のため他の判別材料がない）。
 */
function classifyErrorDescription(description: string): ApiFailure {
  if (description.includes("バックアップ中")) {
    return { kind: "rejected", reason: "backupInProgress", message: description };
  }
  if (description.includes("Dynamoに情報がない")) {
    return { kind: "notFound", message: description };
  }
  if (description.includes("指定してください") || description.includes("URLの異常")) {
    return { kind: "invalidInput", message: description };
  }
  return { kind: "rejected", reason: "serverError", message: description };
}

export class HttpApiClient implements ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = config.apiBaseUrl) {
    // 末尾スラッシュを正規化
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /** 単一 fetch ラッパ。ネットワーク/パース失敗は transport 失敗値に変換し、例外を投げない。 */
  private async request(path: string, init?: RequestInit): Promise<RawFetch> {
    try {
      // ボディを持たない GET/DELETE には Content-Type を付けない。
      // application/json は CORS の単純リクエスト対象外で preflight（OPTIONS）が発生し、
      // /presigned-s3url は OPTIONS 未定義のため preflight で失敗する。
      const hasBody = init?.body !== undefined && init?.body !== null;
      const baseHeaders: HeadersInit = hasBody ? { "Content-Type": "application/json" } : {};
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          ...baseHeaders,
          ...(init?.headers ?? {}),
        },
        // 認証ヘッダは付与しない（C1/C2）
      });
      if (!response.ok) {
        return { ok: false, message: `HTTP ${response.status}` };
      }
      const body: unknown = await response.json();
      return { ok: true, body };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "network error" };
    }
  }

  async listVideos(params: {
    uploadStatus: UploadStatus;
    fetchNum?: number;
  }): Promise<ApiResult<Video[]>> {
    const fetchNum = params.fetchNum ?? 30;
    const query = `upload_status=${encodeURIComponent(params.uploadStatus)}&fetch_num=${fetchNum}`;
    const res = await this.request(`/video?${query}`);
    if (!res.ok) {
      return { kind: "transport", message: res.message };
    }
    // GET /video のみエンベロープなし。DynamoDB item の配列を直接返す。
    if (!Array.isArray(res.body)) {
      return { kind: "transport", message: "expected an array response for GET /video" };
    }
    if (res.body.length === 0) {
      return { kind: "empty" };
    }
    const videos: Video[] = [];
    for (const item of res.body) {
      const video = parseVideo(item);
      if (video === null) {
        return { kind: "transport", message: "video schema mismatch in GET /video" };
      }
      videos.push(video);
    }
    return { kind: "ok", data: videos };
  }

  async getVideo(videoId: string): Promise<ApiResult<Video>> {
    const res = await this.request(`/video/${encodeURIComponent(videoId)}`);
    if (!res.ok) {
      return { kind: "transport", message: res.message };
    }
    const parsed = videoEnvelopeSchema.safeParse(res.body);
    if (!parsed.success) {
      return { kind: "transport", message: "unexpected response shape for GET /video/{id}" };
    }
    if (parsed.data.result === "error") {
      return classifyErrorDescription(parsed.data.description);
    }
    const video = parseVideo(parsed.data.video_data);
    if (video === null) {
      return { kind: "transport", message: "video schema mismatch in GET /video/{id}" };
    }
    return { kind: "ok", data: video };
  }

  async submitVideo(url: string): Promise<ApiResult<SubmitResult>> {
    const res = await this.request(`/video`, {
      method: "POST",
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      return { kind: "transport", message: res.message };
    }
    const parsed = submitEnvelopeSchema.safeParse(res.body);
    if (!parsed.success) {
      return { kind: "transport", message: "unexpected response shape for POST /video" };
    }
    if (parsed.data.result === "error") {
      // 「URLの異常」は invalidInput に正規化される
      return classifyErrorDescription(parsed.data.description);
    }
    const vd = parsed.data.video_data;
    if (!vd) {
      return { kind: "transport", message: "missing video_data in POST /video" };
    }
    // already_backup=true も ok として返す（UI は既登録通知）
    return {
      kind: "ok",
      data: {
        videoId: vd.video_id,
        title: vd.title,
        alreadyBackedUp: vd.already_backup,
        batchJobId: vd.batch_job_id,
      },
    };
  }

  async deleteVideo(videoId: string): Promise<ApiResult<Video>> {
    const res = await this.request(`/video/${encodeURIComponent(videoId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      return { kind: "transport", message: res.message };
    }
    const parsed = videoEnvelopeSchema.safeParse(res.body);
    if (!parsed.success) {
      return { kind: "transport", message: "unexpected response shape for DELETE /video/{id}" };
    }
    if (parsed.data.result === "error") {
      // init かつタイムアウト未経過の削除拒否は rejected(backupInProgress) に正規化される
      return classifyErrorDescription(parsed.data.description);
    }
    const video = parseVideo(parsed.data.video_data);
    if (video === null) {
      return { kind: "transport", message: "video schema mismatch in DELETE /video/{id}" };
    }
    return { kind: "ok", data: video };
  }

  async getPresignedUrl(videoId: string): Promise<ApiResult<string>> {
    const res = await this.request(`/presigned-s3url?video_id=${encodeURIComponent(videoId)}`);
    if (!res.ok) {
      return { kind: "transport", message: res.message };
    }
    const parsed = presignedEnvelopeSchema.safeParse(res.body);
    if (!parsed.success) {
      return { kind: "transport", message: "unexpected response shape for GET /presigned-s3url" };
    }
    if (parsed.data.result === "error") {
      return classifyErrorDescription(parsed.data.description);
    }
    if (!parsed.data.presigned_s3url) {
      return { kind: "transport", message: "missing presigned_s3url" };
    }
    return { kind: "ok", data: parsed.data.presigned_s3url };
  }
}

/** アプリ全体で共有する ApiClient 実体。 */
export const apiClient: ApiClient = new HttpApiClient();
