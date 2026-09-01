import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StatusView, type ViewState } from "./StatusView";

function renderState(state: ViewState<string[]>, onRetry?: () => void) {
  return render(
    <StatusView state={state} onRetry={onRetry} emptyMessage="データがありません">
      {(data) => (
        <ul>
          {data.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </StatusView>,
  );
}

describe("StatusView（UiStateKit / contract C4）", () => {
  it("loading は role=status で描画する", () => {
    renderState({ status: "loading" });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("error は role=alert でメッセージを描画する", () => {
    renderState({ status: "error", message: "取得に失敗しました" });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("取得に失敗しました");
  });

  it("error で onRetry があれば再試行ボタンが押下でコールバックを発火する", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderState({ status: "error", message: "失敗" }, onRetry);
    await user.click(screen.getByRole("button", { name: "再試行" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("error で onRetry がなければ再試行ボタンは描画しない", () => {
    renderState({ status: "error", message: "失敗" });
    expect(screen.queryByRole("button", { name: "再試行" })).not.toBeInTheDocument();
  });

  it("empty(nodata) は emptyMessage を描画する", () => {
    renderState({ status: "empty", variant: "nodata" });
    expect(screen.getByText("データがありません")).toBeInTheDocument();
  });

  it("empty(filtered) は既定メッセージを描画する（emptyMessage 未指定時）", () => {
    render(<StatusView state={{ status: "empty", variant: "filtered" }}>{() => null}</StatusView>);
    expect(screen.getByText("条件に一致するデータがありません")).toBeInTheDocument();
  });

  it("ready は children(data) をレンダリングする", () => {
    renderState({ status: "ready", data: ["a", "b"] });
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
  });
});
