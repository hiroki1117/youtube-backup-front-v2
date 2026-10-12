import { useEffect, useState } from "react";
import { dismiss, subscribe, type Notification, type NotifyKind } from "@/lib/notify";
import { cn } from "@/lib/utils";

// kind（enum）で role と装飾を決める。表示テキストで分岐しない。
const ROLE_BY_KIND: Record<NotifyKind, "alert" | "status"> = {
  error: "alert",
  success: "status",
  info: "status",
};

const STYLE_BY_KIND: Record<NotifyKind, string> = {
  error: "border-destructive/40 bg-destructive text-destructive-foreground",
  success: "border-border bg-primary text-primary-foreground",
  info: "border-border bg-secondary text-secondary-foreground",
};

/** 通知（トースト）の描画（contract C4 NotifyApi の購読側）。 */
export function Toaster() {
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => subscribe(setItems), []);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role={ROLE_BY_KIND[item.kind]}
          className={cn(
            "flex items-start justify-between gap-3 rounded-md border p-3 text-sm shadow-md",
            STYLE_BY_KIND[item.kind],
          )}
        >
          <span>{item.message}</span>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="通知を閉じる"
            className="shrink-0 opacity-80 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
