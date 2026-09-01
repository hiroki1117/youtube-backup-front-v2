import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CatalogControls, type CatalogControlsProps } from "./CatalogControls";

function renderControls(overrides: Partial<CatalogControlsProps> = {}) {
  const props: CatalogControlsProps = {
    uploadStatus: "complete",
    sortOrder: "desc",
    onFilterChange: vi.fn(),
    onSortToggle: vi.fn(),
    onRefresh: vi.fn(),
    isFetching: false,
    ...overrides,
  };
  return { props, ...render(<CatalogControls {...props} />) };
}

describe("CatalogControls（U2 / US2.2・US2.3・US2.5）", () => {
  it("状態フィルタは role=group で現在値を aria-pressed で示す（enum ベース）", () => {
    renderControls({ uploadStatus: "complete" });
    const group = screen.getByRole("group", { name: "状態フィルタ" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "完了" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "処理中" })).toHaveAttribute("aria-pressed", "false");
  });

  it("フィルタ切替で onFilterChange に enum 値を渡す（US2.2）", async () => {
    const user = userEvent.setup();
    const { props } = renderControls({ uploadStatus: "complete" });
    await user.click(screen.getByRole("button", { name: "処理中" }));
    expect(props.onFilterChange).toHaveBeenCalledWith("init");
  });

  it("ソートボタンは現在順のラベルを表示し、押下で onSortToggle を発火する（US2.3）", async () => {
    const user = userEvent.setup();
    const { props } = renderControls({ sortOrder: "desc" });
    const sortButton = screen.getByRole("button", { name: /並び順を切り替え/ });
    expect(sortButton).toHaveTextContent("新しい順");
    await user.click(sortButton);
    expect(props.onSortToggle).toHaveBeenCalledTimes(1);
  });

  it("ソート順 asc のときはラベル「古い順」を表示する", () => {
    renderControls({ sortOrder: "asc" });
    expect(screen.getByRole("button", { name: /並び順を切り替え/ })).toHaveTextContent("古い順");
  });

  it("更新ボタン押下で onRefresh を発火する（US2.5）", async () => {
    const user = userEvent.setup();
    const { props } = renderControls();
    await user.click(screen.getByRole("button", { name: "一覧を更新" }));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });

  it("取得中は更新ボタンを無効化する（二重取得防止）", () => {
    renderControls({ isFetching: true });
    expect(screen.getByRole("button", { name: "一覧を更新" })).toBeDisabled();
  });

  it("取得中でない場合は更新ボタンは有効", () => {
    renderControls({ isFetching: false });
    expect(screen.getByRole("button", { name: "一覧を更新" })).toBeEnabled();
  });
});
