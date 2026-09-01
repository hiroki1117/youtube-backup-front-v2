import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { extractVideoId } from "@/lib/videoId";
import type { Video } from "@/types/video";

/**
 * 動画検索フック（U3 video-search / US3.1・FR3.1・C2）。
 * 入力を `extractVideoId` で video_id へ正規化し、`apiClient.getVideo(videoId)` を
 * TanStack Query（queryKey `["video", videoId]`、submit 時のみ enabled）で取得する。
 *
 * レイヤ境界: hooks は api / lib / types のみに依存し、components には依存しない
 * （ViewState への変換は component 層が担う）。API 失敗の捕捉・分類は ApiClient 層に
 * 一元化済みで、ここは薄い取得アダプタに留める（try/catch を分散させず、ApiResult の
 * discriminated union を kind で分岐する。表示テキストで制御分岐しない）。
 */

/** 検索状態（discriminated union）。component 層はこれを ViewState へ橋渡しする。 */
export type VideoSearchState =
  | { kind: "idle" } // 未検索
  | { kind: "loading" } // 取得中
  | { kind: "ok"; video: Video } // 取得成功
  | { kind: "notFound" } // 未存在（見つからない）
  | { kind: "invalidInput"; message: string } // 入力不正・空（API 非実行）
  | { kind: "error"; message: string }; // transport / 業務拒否など

export interface VideoSearchController {
  /** 入力を video_id へ正規化して検索する。空/不正は API を叩かず invalidInput にする。 */
  search: (input: string) => void;
  /** 現在の検索状態。 */
  state: VideoSearchState;
  /** 取得中フラグ（=useQuery.isFetching）。 */
  isFetching: boolean;
  /** 現在の video_id を再取得する（error 時の再試行に使う。未検索時は無処理）。 */
  refetch: () => void;
}

const TRANSPORT_MESSAGE = "通信に失敗しました。時間をおいて再試行してください。";
const INVALID_INPUT_MESSAGE = "動画 ID または YouTube URL を入力してください。";

export function useVideoSearch(): VideoSearchController {
  // submit 時のみ enabled にするための「検索対象 video_id」。未検索/空入力は null。
  const [videoId, setVideoId] = useState<string | null>(null);
  // 空/不正入力のクライアント検証エラー（API を叩かない）。
  const [validationError, setValidationError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["video", videoId],
    // getVideo は例外を投げず ApiResult を解決する契約（C2）。enabled により videoId 非 null 時のみ実行。
    queryFn: () => {
      if (videoId === null) {
        // enabled=false のため到達しないが、silent failure にせず明示的に失敗させる。
        throw new Error("videoId is null");
      }
      return apiClient.getVideo(videoId);
    },
    enabled: videoId !== null,
  });

  const search = useCallback((input: string) => {
    const id = extractVideoId(input);
    if (id === null) {
      // 空/不正入力: API を叩かずバリデーションエラーにする（US3.1）。
      setValidationError(INVALID_INPUT_MESSAGE);
      setVideoId(null);
      return;
    }
    setValidationError(null);
    setVideoId(id);
  }, []);

  const refetch = useCallback(() => {
    if (videoId !== null) {
      void query.refetch();
    }
  }, [videoId, query]);

  const state = useMemo<VideoSearchState>(() => {
    if (validationError !== null) {
      return { kind: "invalidInput", message: validationError };
    }
    if (videoId === null) {
      return { kind: "idle" };
    }
    if (query.isError) {
      return { kind: "error", message: TRANSPORT_MESSAGE };
    }
    if (query.data === undefined) {
      return { kind: "loading" };
    }
    const result = query.data;
    switch (result.kind) {
      case "ok":
        return { kind: "ok", video: result.data };
      case "notFound":
        return { kind: "notFound" };
      case "invalidInput":
        return { kind: "invalidInput", message: result.message };
      case "transport":
        return { kind: "error", message: TRANSPORT_MESSAGE };
      case "rejected":
        return { kind: "error", message: result.message };
      case "empty":
        return { kind: "error", message: "動画を取得できませんでした。" };
    }
  }, [validationError, videoId, query.isError, query.data]);

  return {
    search,
    state,
    isFetching: query.isFetching,
    refetch,
  };
}
