import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadPresignedUrl } from "./download";

/**
 * DL 起動ロジックのユニットテスト（U6 / FR6.2・NFR4）。
 * 実ダウンロードはせず、生成される `<a>` 要素の属性と click 起動、非 https の拒否を検証する。
 * `document.createElement("a")` をスパイして生成アンカーを捕捉し、click を no-op にする。
 */

function spyAnchor() {
  const anchor = document.createElement("a");
  const clickSpy = vi.spyOn(anchor, "click").mockImplementation(() => {});
  const createSpy = vi.spyOn(document, "createElement").mockReturnValue(anchor);
  return { anchor, clickSpy, createSpy };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downloadPresignedUrl（U6 / FR6.2・NFR4）", () => {
  it("有効な https URL でダウンロードを起動し true を返す（happy path）", () => {
    const { anchor, clickSpy } = spyAnchor();

    const ok = downloadPresignedUrl("https://example.com/video.mp4");

    expect(ok).toBe(true);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(anchor.href).toBe("https://example.com/video.mp4");
  });

  it("生成アンカーに rel=noopener noreferrer を必ず付与する（NFR4 tabnabbing 対策）", () => {
    const { anchor } = spyAnchor();

    downloadPresignedUrl("https://example.com/video.mp4");

    expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("filename を download 属性に反映する", () => {
    const { anchor } = spyAnchor();

    downloadPresignedUrl("https://example.com/video.mp4", "my-video.mp4");

    expect(anchor.getAttribute("download")).toBe("my-video.mp4");
  });

  it("filename 省略時は download 属性を空文字にする（ブラウザ既定に委ねる）", () => {
    const { anchor } = spyAnchor();

    downloadPresignedUrl("https://example.com/video.mp4");

    expect(anchor.getAttribute("download")).toBe("");
  });

  it("空白のみの filename は download 属性を空文字にする", () => {
    const { anchor } = spyAnchor();

    downloadPresignedUrl("https://example.com/video.mp4", "   ");

    expect(anchor.getAttribute("download")).toBe("");
  });

  it("起動後にアンカーを DOM から除去する（後片付け）", () => {
    const { anchor } = spyAnchor();

    downloadPresignedUrl("https://example.com/video.mp4");

    expect(document.body.contains(anchor)).toBe(false);
  });

  it("http（非 https）URL は拒否して false を返し click しない（NFR4 / error-path）", () => {
    const { clickSpy } = spyAnchor();

    const ok = downloadPresignedUrl("http://example.com/video.mp4");

    expect(ok).toBe(false);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("javascript: スキームは拒否して false を返す（スキーム injection 対策 / error-path）", () => {
    const { clickSpy } = spyAnchor();

    const ok = downloadPresignedUrl("javascript:alert(1)");

    expect(ok).toBe(false);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("空文字・URL 構文不正は拒否して false を返す（error-path）", () => {
    spyAnchor();

    expect(downloadPresignedUrl("")).toBe(false);
    expect(downloadPresignedUrl("   ")).toBe(false);
    expect(downloadPresignedUrl("not a url")).toBe(false);
  });
});
