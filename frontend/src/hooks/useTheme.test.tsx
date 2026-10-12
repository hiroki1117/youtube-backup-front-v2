import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";

function Probe() {
  const { theme } = useTheme();
  return <span data-testid="theme">{theme}</span>;
}

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <Probe />
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeProvider / useTheme（WF5 / FR10）", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("localStorage に保存済みのテーマを初期値として反映する", () => {
    localStorage.setItem("theme", "dark");
    renderWithTheme();
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("保存値がなければ prefers-color-scheme(dark) にフォールバックする", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    renderWithTheme();
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("保存値も prefers-color-scheme もなければ light を既定とする", () => {
    renderWithTheme();
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("トグルでテーマが反転し localStorage と data-theme に永続化される", async () => {
    const user = userEvent.setup();
    renderWithTheme();
    expect(screen.getByTestId("theme")).toHaveTextContent("light");

    await user.click(screen.getByRole("button", { name: "ダークモードに切り替え" }));

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("useTheme を Provider 外で使うとエラーになる", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ThemeProvider/);
    spy.mockRestore();
  });
});
