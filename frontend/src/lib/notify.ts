/**
 * 通知（トースト）基盤（contract C4 NotifyApi）。
 * モジュールレベルの pub/sub。`notify(kind, message)` をどの層からも呼べ、
 * `Toaster` コンポーネントが購読して描画する。表示テキストで制御分岐しない
 * （kind の discriminated union で状態を表現する）。
 */
export type NotifyKind = "success" | "info" | "error";

export interface Notification {
  id: number;
  kind: NotifyKind;
  message: string;
}

type Listener = (notifications: Notification[]) => void;

let notifications: Notification[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit(): void {
  const snapshot = [...notifications];
  for (const listener of listeners) {
    listener(snapshot);
  }
}

/** 通知を発行する。 */
export function notify(kind: NotifyKind, message: string): void {
  const notification: Notification = { id: nextId++, kind, message };
  notifications = [...notifications, notification];
  emit();
}

/** 指定 id の通知を消す。 */
export function dismiss(id: number): void {
  notifications = notifications.filter((n) => n.id !== id);
  emit();
}

/** 全通知を消す（主にテスト用の初期化）。 */
export function clearNotifications(): void {
  notifications = [];
  emit();
}

/** 通知の変更を購読する。戻り値の関数で購読解除。 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener([...notifications]);
  return () => {
    listeners.delete(listener);
  };
}
