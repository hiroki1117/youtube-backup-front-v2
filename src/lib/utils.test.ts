import { afterEach, describe, expect, it, vi } from "vitest";
import { cn, openExternalUrl } from "./utils";

describe("cn", () => {
  it("クラスを結合する", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("falsy を除外し、Tailwind の衝突を後勝ちで解決する", () => {
    expect(cn("p-2", false, undefined, "p-4")).toBe("p-4");
  });
});

describe("openExternalUrl（team code style: https 検証 + noopener,noreferrer）", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("https の URL を noopener,noreferrer で開き true を返す", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const ok = openExternalUrl("https://example.com/file.mp4");
    expect(ok).toBe(true);
    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/file.mp4",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("http（非 https）スキームは開かず false を返す", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    expect(openExternalUrl("http://example.com/file.mp4")).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("javascript: スキームは開かず false を返す（スキーム injection 対策）", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    expect(openExternalUrl("javascript:alert(1)")).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("URL として解釈できない値は false を返す", () => {
    expect(openExternalUrl("not a url")).toBe(false);
  });
});
