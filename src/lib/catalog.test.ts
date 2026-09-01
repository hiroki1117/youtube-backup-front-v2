import { describe, expect, it } from "vitest";
import { makeVideos } from "@/test/factories";
import { CATALOG_PAGE_SIZE, paginate, sortVideos } from "./catalog";

describe("sortVideos（US2.3 / FR2.3）", () => {
  it("desc は backupDate 降順に並べる", () => {
    const videos = makeVideos([
      { videoId: "a", backupDate: "2026-08-01" },
      { videoId: "b", backupDate: "2026-08-03" },
      { videoId: "c", backupDate: "2026-08-02" },
    ]);
    const sorted = sortVideos(videos, "desc");
    expect(sorted.map((v) => v.videoId)).toEqual(["b", "c", "a"]);
  });

  it("asc は backupDate 昇順に並べる", () => {
    const videos = makeVideos([
      { videoId: "a", backupDate: "2026-08-01" },
      { videoId: "b", backupDate: "2026-08-03" },
      { videoId: "c", backupDate: "2026-08-02" },
    ]);
    const sorted = sortVideos(videos, "asc");
    expect(sorted.map((v) => v.videoId)).toEqual(["a", "c", "b"]);
  });

  it("同一 backupDate は入力順を保持する（安定ソート・降順）", () => {
    const videos = makeVideos([
      { videoId: "x1", backupDate: "2026-08-05" },
      { videoId: "x2", backupDate: "2026-08-05" },
      { videoId: "x3", backupDate: "2026-08-05" },
    ]);
    const sorted = sortVideos(videos, "desc");
    expect(sorted.map((v) => v.videoId)).toEqual(["x1", "x2", "x3"]);
  });

  it("入力配列を破壊しない（新しい配列を返す）", () => {
    const videos = makeVideos([
      { videoId: "a", backupDate: "2026-08-01" },
      { videoId: "b", backupDate: "2026-08-02" },
    ]);
    const original = videos.map((v) => v.videoId);
    sortVideos(videos, "desc");
    expect(videos.map((v) => v.videoId)).toEqual(original);
  });

  it("空配列はそのまま空を返す", () => {
    expect(sortVideos([], "asc")).toEqual([]);
  });
});

describe("paginate（US2.4 / FR2.4 / R-03）", () => {
  const items = Array.from({ length: 45 }, (_unused, i) => i + 1); // 1..45

  it("通常ページ: 先頭ページを pageSize 件返す", () => {
    const result = paginate(items, 1, 20);
    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toBe(1);
    expect(result.pageCount).toBe(3);
    expect(result.page).toBe(1);
  });

  it("端数ページ: 最終ページは余り件数のみ返す", () => {
    const result = paginate(items, 3, 20);
    expect(result.items).toEqual([41, 42, 43, 44, 45]);
    expect(result.pageCount).toBe(3);
    expect(result.page).toBe(3);
  });

  it("範囲外ページ（大きすぎ）は最終ページへクランプする", () => {
    const result = paginate(items, 99, 20);
    expect(result.page).toBe(3);
    expect(result.items).toEqual([41, 42, 43, 44, 45]);
  });

  it("範囲外ページ（0 以下）は先頭ページへクランプする", () => {
    const result = paginate(items, 0, 20);
    expect(result.page).toBe(1);
    expect(result.items[0]).toBe(1);
  });

  it("空配列は items 空・pageCount 1・page 1 を返す", () => {
    const result = paginate<number>([], 1, 20);
    expect(result.items).toEqual([]);
    expect(result.pageCount).toBe(1);
    expect(result.page).toBe(1);
  });

  it("pageSize 境界: pageSize=1 で 1 件ずつ分割する", () => {
    const result = paginate(items, 5, 1);
    expect(result.items).toEqual([5]);
    expect(result.pageCount).toBe(45);
  });

  it("pageSize が総件数以上なら 1 ページに全件収める", () => {
    const result = paginate(items, 1, 100);
    expect(result.items).toHaveLength(45);
    expect(result.pageCount).toBe(1);
  });

  it("pageSize 未指定時は CATALOG_PAGE_SIZE を使う", () => {
    const result = paginate(items, 1);
    expect(result.items).toHaveLength(CATALOG_PAGE_SIZE);
  });
});
