import type { Video } from "@/types/video";

/**
 * カタログ業務ロジック（U2 video-catalog）。
 * 一覧のソート／ページングを純粋関数として leaf の lib に置く（副作用なし・API 非依存）。
 * API はサーバーサイド任意ソート・カーソルページング非対応（requirements.md R-03/R-05）のため、
 * 全件取得後にフロントで整列／分割する。
 */

/** 一覧のソート順（backupDate 基準の昇順/降順）。表示ラベルではなく enum で状態を表す。 */
export type SortOrder = "asc" | "desc";

/** クライアントサイドページングの 1 ページあたり件数（FR2.4 / R-03）。 */
export const CATALOG_PAGE_SIZE = 20;

/** paginate の戻り値。 */
export interface PaginationResult<T> {
  items: T[];
  pageCount: number;
  /** [1, pageCount] にクランプ済みの実効ページ番号。 */
  page: number;
}

/**
 * backupDate（YYYY-MM-DD）でソートした新しい配列を返す（入力は破壊しない）。
 * backupDate は固定長 ISO 日付文字列のため辞書順比較が日付順と一致する。
 * 同一 backupDate の相対順は入力順を保持する（安定ソート。エンジン依存を避けるため index で明示安定化）。
 * (US2.3 / FR2.3 / R-05)
 *
 * @param videos ソート対象（不変）
 * @param order 昇順 "asc" / 降順 "desc"
 * @returns ソート済みの新しい配列
 */
export function sortVideos(videos: Video[], order: SortOrder): Video[] {
  const factor = order === "asc" ? 1 : -1;
  return videos
    .map((video, index) => ({ video, index }))
    .sort((a, b) => {
      if (a.video.backupDate < b.video.backupDate) {
        return -factor;
      }
      if (a.video.backupDate > b.video.backupDate) {
        return factor;
      }
      // 同一 backupDate は入力順を維持（安定化）
      return a.index - b.index;
    })
    .map((entry) => entry.video);
}

/**
 * クライアントサイドページング（FR2.4 / R-03: API はカーソルページング非対応）。
 * page は [1, pageCount] にクランプする（範囲外指定は端ページへ丸める）。
 * pageCount は最低 1（0 件でも "1 / 1" を表示できるようにする）。
 * pageSize が不正（<= 0）な場合は 1 に補正して 0 除算・Infinity を防ぐ。
 *
 * @param items 全件（ソート済みを渡す想定）
 * @param page 要求ページ（1 始まり）
 * @param pageSize 1 ページあたり件数（既定 CATALOG_PAGE_SIZE）
 */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number = CATALOG_PAGE_SIZE,
): PaginationResult<T> {
  const size = Math.max(1, Math.trunc(pageSize));
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, Math.trunc(page)), pageCount);
  const start = (safePage - 1) * size;
  return {
    items: items.slice(start, start + size),
    pageCount,
    page: safePage,
  };
}
