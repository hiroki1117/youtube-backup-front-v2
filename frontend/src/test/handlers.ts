import { http, HttpResponse } from "msw";
import { makeRawVideo, type RawVideo } from "./factories";

// vitest.config.ts の test.env と一致させる（テスト用 placeholder）。
export const TEST_API_BASE = "https://api.test.invalid";

/**
 * 状態別の既定データセット（backupdate 違いで複数件）。
 * ソート（backupDate 昇順/降順）・ページング検証のため、意図的に日付を非整列で並べる。
 */
export const COMPLETE_RAW_VIDEOS: RawVideo[] = [
  makeRawVideo({
    video_id: "c1",
    title: "完了動画1",
    backupdate: "2026-08-01",
    platform: "youtube",
  }),
  makeRawVideo({
    video_id: "c2",
    title: "完了動画2",
    backupdate: "2026-08-03",
    platform: "twitter",
  }),
  makeRawVideo({
    video_id: "c3",
    title: "完了動画3",
    backupdate: "2026-08-02",
    platform: "youtube",
  }),
];

export const INIT_RAW_VIDEOS: RawVideo[] = [
  makeRawVideo({
    video_id: "i1",
    title: "処理中動画1",
    backupdate: "2026-07-20",
    upload_status: "init",
    platform: "youtube",
  }),
  makeRawVideo({
    video_id: "i2",
    title: "処理中動画2",
    backupdate: "2026-07-25",
    upload_status: "init",
    platform: "twitter",
  }),
];

/** POST /video の成功エンベロープ形状（SubmitEnvelope, C2）。 */
export interface SubmitEnvelope {
  result: "succ" | "error";
  description: string;
  video_data: {
    video_id: string;
    title: string;
    already_backup: boolean;
    batch_job_id: string;
    s3: string;
  } | null;
}

/**
 * POST /video の成功エンベロープを生成する（U4 登録テスト用）。
 * `already_backup` で新規登録／既登録を切り替える（C2: 既登録も result=succ）。
 */
export function makeSubmitEnvelope(
  overrides: Partial<{
    description: string;
    video_id: string;
    title: string;
    already_backup: boolean;
    batch_job_id: string;
  }> = {},
): SubmitEnvelope {
  const alreadyBackup = overrides.already_backup ?? false;
  return {
    result: "succ",
    description:
      overrides.description ?? (alreadyBackup ? "バックアップ済み" : "バックアップ処理開始"),
    video_data: {
      video_id: overrides.video_id ?? "new1",
      title: overrides.title ?? "新規登録動画",
      already_backup: alreadyBackup,
      batch_job_id: overrides.batch_job_id ?? "job-new1",
      s3: "s3://example-bucket/new1.mp4",
    },
  };
}

/**
 * POST /video の error エンベロープ（既存 API はエラーも HTTP 200）。
 * 既定の「URLの異常」は ApiClient で invalidInput に正規化される（C2）。
 */
export function submitErrorEnvelope(description = "URLの異常"): SubmitEnvelope {
  return { result: "error", description, video_data: null };
}

/** GET /video/{video_id} の成功/エラーエンベロープ形状（VideoEnvelope, C2）。 */
export interface VideoEnvelope {
  result: "succ" | "error";
  description: string;
  video_data: RawVideo | null;
}

/**
 * GET /video/{video_id} の成功エンベロープを生成する（U3 検索テスト用）。
 * `upload_status` を切り替えて complete（再生ナビ提供）／init（再生ナビ非提供）を再現する。
 */
export function makeVideoEnvelope(overrides: Partial<RawVideo> = {}): VideoEnvelope {
  return {
    result: "succ",
    description: "取得成功",
    video_data: makeRawVideo(overrides),
  };
}

/**
 * GET /video/{video_id} の未存在エンベロープ（既存 API はエラーも HTTP 200）。
 * description「Dynamoに情報がない」は ApiClient で notFound に正規化される（C2）。
 */
export function videoNotFoundEnvelope(): VideoEnvelope {
  return { result: "error", description: "Dynamoに情報がない", video_data: null };
}

/**
 * DELETE /video/{video_id} の成功エンベロープを生成する（U5 削除テスト用）。
 * 削除された Video を `video_data` に返す（VideoEnvelope, C2）。
 */
export function makeDeleteEnvelope(overrides: Partial<RawVideo> = {}): VideoEnvelope {
  return {
    result: "succ",
    description: "削除しました",
    video_data: makeRawVideo(overrides),
  };
}

/**
 * DELETE /video/{video_id} のバックアップ中拒否エンベロープ（既存 API はエラーも HTTP 200）。
 * `upload_status=init` かつタイムアウト未経過（10800 秒）の削除拒否を再現する（R-02）。
 * description「バックアップ中」は ApiClient で rejected(backupInProgress) に正規化される（C2）。
 */
export function deleteBackupInProgressEnvelope(): VideoEnvelope {
  return { result: "error", description: "バックアップ中のため削除できません", video_data: null };
}

/** GET /presigned-s3url の成功/エラーエンベロープ形状（PresignedEnvelope, C2）。 */
export interface PresignedEnvelope {
  result: "succ" | "error";
  description: string;
  presigned_s3url: string | null;
}

/** テスト用の署名 URL（https。download.ts の https 検証・<video src> の再生ソースに使う）。 */
export const TEST_PRESIGNED_URL =
  "https://s3.ap-northeast-1.amazonaws.com/example-bucket/v1.mp4?sig=test";

/**
 * GET /presigned-s3url の成功エンベロープを生成する（U6 再生/DL テスト用）。
 * description「取得成功」・presigned_s3url は https（有効期限 3600 秒相当）。
 * ApiClient は presigned_s3url を ok(string) に正規化する（C2）。
 */
export function makePresignedEnvelope(url: string = TEST_PRESIGNED_URL): PresignedEnvelope {
  return { result: "succ", description: "取得成功", presigned_s3url: url };
}

/**
 * GET /presigned-s3url の未存在エンベロープ（既存 API はエラーも HTTP 200）。
 * description「Dynamoに情報がない」は ApiClient で notFound に正規化される（C2）。
 */
export function presignedNotFoundEnvelope(): PresignedEnvelope {
  return { result: "error", description: "Dynamoに情報がない", presigned_s3url: null };
}

/**
 * 既定ハンドラ（happy path）。`upload_status` クエリに応じて状態別配列を返す。
 * GET /video はエンベロープなしの裸配列（C1/C2）。POST /video は既定で新規登録成功を返す。
 * 個別の失敗系・空系・既登録・ページング件数は各テストで server.use() により上書きする。
 * ハンドラは unit / integration で共有し、実装詳細への結合を避ける。
 */
export const handlers = [
  http.get(`${TEST_API_BASE}/video`, ({ request }) => {
    const status = new URL(request.url).searchParams.get("upload_status");
    if (status === "init") {
      return HttpResponse.json(INIT_RAW_VIDEOS);
    }
    return HttpResponse.json(COMPLETE_RAW_VIDEOS);
  }),
  // POST /video: 既定は新規登録成功（US4.1 / FR4.1）。既登録・URL異常・transport は各テストで上書き。
  http.post(`${TEST_API_BASE}/video`, () => HttpResponse.json(makeSubmitEnvelope())),
  // GET /video/{video_id}: 既定は complete 動画の取得成功（U3 検索 / FR3.1）。
  // 未存在（notFound）・transport 失敗・init 動画は各テストで server.use() により上書きする。
  http.get(`${TEST_API_BASE}/video/:videoId`, () => HttpResponse.json(makeVideoEnvelope())),
  // DELETE /video/{video_id}: 既定は削除成功（US5.1 / FR5.1）。
  // バックアップ中拒否（rejected/backupInProgress）・transport 失敗は各テストで server.use() により上書きする。
  http.delete(`${TEST_API_BASE}/video/:videoId`, () => HttpResponse.json(makeDeleteEnvelope())),
  // GET /presigned-s3url?video_id=: 既定は署名 URL 取得成功（U6 再生/DL / FR6.1・FR7.2）。
  // 未存在（notFound）・transport/CORS 失敗は各テストで server.use() により上書きする。
  http.get(`${TEST_API_BASE}/presigned-s3url`, () => HttpResponse.json(makePresignedEnvelope())),
];
