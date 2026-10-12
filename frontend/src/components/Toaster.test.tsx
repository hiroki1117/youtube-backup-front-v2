import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Toaster } from "./Toaster";
import { notify } from "@/lib/notify";

describe("Toaster（UiStateKit 通知描画）", () => {
  it("通知がなければ何も描画しない", () => {
    const { container } = render(<Toaster />);
    expect(container).toBeEmptyDOMElement();
  });

  it("error 通知は role=alert で描画する", async () => {
    render(<Toaster />);
    act(() => notify("error", "エラーが発生しました"));
    expect(await screen.findByRole("alert")).toHaveTextContent("エラーが発生しました");
  });

  it("success 通知は role=status で描画する", () => {
    render(<Toaster />);
    act(() => notify("success", "保存しました"));
    expect(screen.getByRole("status")).toHaveTextContent("保存しました");
  });

  it("閉じるボタンで通知を消す", async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    act(() => notify("info", "お知らせ"));
    expect(screen.getByText("お知らせ")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "通知を閉じる" }));
    expect(screen.queryByText("お知らせ")).not.toBeInTheDocument();
  });
});
