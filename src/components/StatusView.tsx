import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * UiStateKit 状態表示（contract C4 ViewState<T>）。
 * loading/error/empty/ready を discriminated union で統一表示する。
 * role/aria（status/alert）を付与し、色のみに依存しない。表示テキストで制御分岐しない。
 */
export type ViewState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; variant: "nodata" | "filtered" }
  | { status: "ready"; data: T };

export interface StatusViewProps<T> {
  state: ViewState<T>;
  onRetry?: () => void;
  children: (data: T) => ReactNode; // ready 時のレンダラ
  emptyMessage?: string;
  loadingLabel?: string;
}

const DEFAULT_EMPTY_MESSAGE: Record<"nodata" | "filtered", string> = {
  nodata: "データがありません",
  filtered: "条件に一致するデータがありません",
};

export function StatusView<T>({
  state,
  onRetry,
  children,
  emptyMessage,
  loadingLabel,
}: StatusViewProps<T>) {
  switch (state.status) {
    case "loading":
      return (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 p-8 text-muted-foreground"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>{loadingLabel ?? "読み込み中..."}</span>
        </div>
      );
    case "error":
      return (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-6 text-center"
        >
          <p className="text-sm text-destructive">{state.message}</p>
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              再試行
            </Button>
          ) : null}
        </div>
      );
    case "empty":
      return (
        <div role="status" className="p-8 text-center text-muted-foreground">
          {emptyMessage ?? DEFAULT_EMPTY_MESSAGE[state.variant]}
        </div>
      );
    case "ready":
      return <>{children(state.data)}</>;
  }
}
