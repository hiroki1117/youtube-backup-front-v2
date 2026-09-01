import { useCallback, useMemo } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient, type ApiResult } from "@/api/client";
import type { Video } from "@/types/video";

/**
 * 再生フック（U6 video-playback / US6.2・FR7・C2）。
 * `videoId` から動画詳細（`getVideo`）を取得し、`complete` の場合のみ再生用の署名 URL
 * （`getPresignedUrl`）を取得する（A3: 対象は complete のみ）。ApiClient が正規化した型付き
 * 失敗値（ApiResult）を discriminated union の kind で判別し、画面が描画に使える状態へ橋渡しする。
 *
 * レイヤ境界: hooks は api / types のみに依存し、components には依存しない
 * （ViewState への変換は app/component 層が担う）。API 失敗の捕捉・分類は ApiClient 層に
 * 一元化済みで、ここは薄い取得アダプタに留める（try/catch を分散させない）。
 */

/** 再生ソース（署名 URL）の取得状態（complete 動画のみ意味を持つ）。 */
export type PlaybackSource =
  | { status: "loading" } // 署名 URL 取得中
  | { status: "error"; message: string } // 署名 URL 取得失敗（OQ2: CORS/期限切れ等の再生不可フォールバック）
  | { status: "ready"; url: string }; // 署名 URL 取得成功（<video src> に使う）

/** 再生ページの状態（discriminated union。表示テキストで制御分岐しない）。 */
export type PlaybackState =
  | { kind: "loading" } // 詳細取得中
  | { kind: "notFound" } // 詳細が未存在（動画が見つからない）
  | { kind: "error"; message: string } // 詳細取得の transport / 業務失敗
  | { kind: "notPlayable"; video: Video } // init（A3: 再生/DL 不可）
  | { kind: "ready"; video: Video; source: PlaybackSource }; // complete（再生可能）

export interface VideoPlaybackController {
  /** 現在の再生ページ状態。 */
  state: PlaybackState;
  /** 詳細取得中フラグ。 */
  isFetching: boolean;
  /** 詳細 + 署名 URL を再取得する（error フォールバックからの再試行 / OQ2）。 */
  refetch: () => void;
}

const DETAIL_TRANSPORT_MESSAGE = "通信に失敗しました。時間をおいて再試行してください。";
const DETAIL_EMPTY_MESSAGE = "動画情報を取得できませんでした。";
const PLAYBACK_ERROR_MESSAGE =
  "再生用の URL を取得できませんでした。時間をおいて再試行してください。";

/** 署名 URL 取得クエリの結果を PlaybackSource へ変換する（complete 時のみ呼ぶ）。 */
function derivePlaybackSource(query: UseQueryResult<ApiResult<string>, Error>): PlaybackSource {
  if (query.data === undefined) {
    if (query.isError) {
      // 契約上 getPresignedUrl は throw しないが、想定外の reject も silent にしない（FR8）。
      return { status: "error", message: PLAYBACK_ERROR_MESSAGE };
    }
    return { status: "loading" };
  }
  const result = query.data;
  switch (result.kind) {
    case "ok":
      return { status: "ready", url: result.data };
    case "notFound":
    case "invalidInput":
    case "rejected":
      return { status: "error", message: result.message };
    case "transport":
      // CORS/ネットワーク失敗（OQ2）。error フォールバックへ。
      return { status: "error", message: PLAYBACK_ERROR_MESSAGE };
    case "empty":
      return { status: "error", message: PLAYBACK_ERROR_MESSAGE };
  }
}

export function useVideoPlayback(videoId: string): VideoPlaybackController {
  const detailQuery = useQuery<ApiResult<Video>, Error>({
    queryKey: ["video", videoId],
    // getVideo は例外を投げず ApiResult を解決する契約（C2）。
    queryFn: () => apiClient.getVideo(videoId),
  });

  // complete のときだけ署名 URL を取得する（A3。init/未存在では取得しない）。
  const isComplete =
    detailQuery.data?.kind === "ok" && detailQuery.data.data.uploadStatus === "complete";

  const presignedQuery = useQuery<ApiResult<string>, Error>({
    queryKey: ["presigned", videoId],
    queryFn: () => apiClient.getPresignedUrl(videoId),
    enabled: isComplete,
  });

  const state = useMemo<PlaybackState>(() => {
    if (detailQuery.data === undefined) {
      if (detailQuery.isError) {
        return { kind: "error", message: DETAIL_TRANSPORT_MESSAGE };
      }
      return { kind: "loading" };
    }
    const detail = detailQuery.data;
    switch (detail.kind) {
      case "notFound":
        return { kind: "notFound" };
      case "invalidInput":
      case "rejected":
        return { kind: "error", message: detail.message };
      case "transport":
        return { kind: "error", message: DETAIL_TRANSPORT_MESSAGE };
      case "empty":
        return { kind: "error", message: DETAIL_EMPTY_MESSAGE };
      case "ok": {
        const video = detail.data;
        if (video.uploadStatus !== "complete") {
          // A3: complete 以外は再生/DL 対象外。
          return { kind: "notPlayable", video };
        }
        return { kind: "ready", video, source: derivePlaybackSource(presignedQuery) };
      }
    }
  }, [detailQuery.data, detailQuery.isError, presignedQuery]);

  const refetch = useCallback(() => {
    void detailQuery.refetch();
    if (isComplete) {
      void presignedQuery.refetch();
    }
  }, [detailQuery, presignedQuery, isComplete]);

  return {
    state,
    isFetching: detailQuery.isFetching || (isComplete && presignedQuery.isFetching),
    refetch,
  };
}
