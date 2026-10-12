import { useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient, type ApiResult } from "@/api/client";
import { downloadPresignedUrl } from "@/lib/download";
import { notify } from "@/lib/notify";
import type { Video } from "@/types/video";

/**
 * ダウンロードフック（U6 video-playback / US6.1・FR6・C2・C4）。
 * `complete` の動画に対し署名 URL（`getPresignedUrl`）を取得し、`downloadPresignedUrl` で
 * ダウンロードを起動する（A3: 対象は complete のみ）。ApiClient が正規化した型付き失敗値
 * （ApiResult）を kind で判別し、失敗時は通知（C4 notify）へ橋渡しする（silent failure にしない / FR8）。
 *
 * レイヤ境界: hooks は api / lib / types のみに依存する。API 失敗の捕捉・分類は ApiClient 層に
 * 一元化済みで、ここでは try/catch を分散させず discriminated union の kind で分岐する
 * （表示テキストで制御分岐しない）。
 */

export interface VideoDownloadController {
  /**
   * 動画のダウンロードを開始する（署名 URL 取得 → download 起動）。
   * complete 以外（init 等）は対象外として何もしない（A3。防御的ガード）。
   * 実行中の再呼び出しは無視する（二重起動抑止）。
   */
  download: (video: Video) => void;
  /** 署名 URL 取得中フラグ（ダウンロードボタンの無効化に使う）。 */
  isPreparing: boolean;
}

/**
 * ok 以外の ApiResult を人間可読なエラーメッセージへ変換する。
 * 分岐は discriminated union の kind で行う（表示テキストでは分岐しない）。
 */
function toErrorMessage(result: Exclude<ApiResult<string>, { kind: "ok" }>): string {
  switch (result.kind) {
    case "notFound":
    case "invalidInput":
    case "rejected":
      return result.message;
    case "transport":
      return "通信に失敗しました。時間をおいて再試行してください。";
    case "empty":
      return "ダウンロード用 URL を取得できませんでした。";
  }
}

/** ダウンロードファイル名のヒント。title を優先し、空なら video_id を使う（拡張子はサーバー URL 由来に委ねる）。 */
function toFilename(video: Video): string {
  const title = video.title.trim();
  return title === "" ? video.videoId : title;
}

interface DownloadOutcome {
  result: ApiResult<string>;
  video: Video;
}

export function useVideoDownload(): VideoDownloadController {
  // isPending が true へ反映される前の同期的な連打も抑止するための実行中フラグ。
  const inFlight = useRef(false);

  const mutation = useMutation<DownloadOutcome, Error, Video>({
    // getPresignedUrl は例外を投げず ApiResult を解決する契約（C2）。
    mutationFn: async (video) => {
      const result = await apiClient.getPresignedUrl(video.videoId);
      return { result, video };
    },
    onSuccess: ({ result, video }) => {
      if (result.kind === "ok") {
        const started = downloadPresignedUrl(result.data, toFilename(video));
        if (!started) {
          // 非 https 等で download.ts が拒否したケース（NFR4）。silent failure にしない。
          notify("error", "ダウンロード用 URL が無効です。");
        }
        return;
      }
      // 未存在・transport（CORS 含む）・業務拒否は通知する（C4 / FR8）。
      notify("error", toErrorMessage(result));
    },
    onError: () => {
      // 契約上ここには来ないが、想定外の throw も silent failure にしない（FR8 / Construction ガードレール）。
      notify("error", "ダウンロード処理でエラーが発生しました。");
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const download = useCallback(
    (video: Video) => {
      if (video.uploadStatus !== "complete") {
        // A3: complete 以外は DL 対象外（行アクションでも非表示だが hook 側でも防御する）。
        return;
      }
      if (inFlight.current) {
        return;
      }
      inFlight.current = true;
      mutation.mutate(video);
    },
    [mutation],
  );

  return {
    download,
    isPreparing: mutation.isPending,
  };
}
