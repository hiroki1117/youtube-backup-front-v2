import { describe, expect, it, vi } from "vitest";
import { clearNotifications, dismiss, notify, subscribe, type Notification } from "./notify";

describe("notify（UiStateKit / contract C4 NotifyApi）", () => {
  it("購読者は購読時に現在の一覧を受け取り、notify で更新される", () => {
    const listener = vi.fn<(items: Notification[]) => void>();
    const unsubscribe = subscribe(listener);
    expect(listener).toHaveBeenLastCalledWith([]);

    notify("success", "登録しました");
    const last = listener.mock.calls.at(-1)?.[0];
    expect(last).toHaveLength(1);
    expect(last?.[0]).toMatchObject({ kind: "success", message: "登録しました" });
    unsubscribe();
  });

  it("dismiss は該当 id の通知を除去する", () => {
    const listener = vi.fn<(items: Notification[]) => void>();
    const unsubscribe = subscribe(listener);
    notify("error", "失敗しました");
    const created = listener.mock.calls.at(-1)?.[0]?.[0];
    expect(created).toBeDefined();
    if (created) {
      dismiss(created.id);
    }
    expect(listener.mock.calls.at(-1)?.[0]).toHaveLength(0);
    unsubscribe();
  });

  it("購読解除後は通知を受け取らない", () => {
    const listener = vi.fn<(items: Notification[]) => void>();
    const unsubscribe = subscribe(listener);
    unsubscribe();
    const callsBefore = listener.mock.calls.length;
    notify("info", "情報");
    expect(listener.mock.calls.length).toBe(callsBefore);
  });

  it("clearNotifications は全通知を消す", () => {
    const listener = vi.fn<(items: Notification[]) => void>();
    const unsubscribe = subscribe(listener);
    notify("info", "a");
    notify("info", "b");
    clearNotifications();
    expect(listener.mock.calls.at(-1)?.[0]).toHaveLength(0);
    unsubscribe();
  });
});
