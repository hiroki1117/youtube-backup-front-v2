import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, signInMock, signOutMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("@/api/auth", () => ({
  authModule: {
    getSession: getSessionMock,
    signIn: signInMock,
    signOut: signOutMock,
  },
}));

import { AuthProvider, useAuth } from "./useAuth";

function Probe() {
  const { status, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <button type="button" onClick={() => void signIn("u", "p")}>
        in
      </button>
      <button type="button" onClick={() => void signOut()}>
        out
      </button>
    </div>
  );
}

describe("AuthProvider / useAuth（SM1）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("起動時にセッション復元を試み unauthenticated を配布する", async () => {
    getSessionMock.mockResolvedValue("unauthenticated");
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText("unauthenticated")).toBeInTheDocument();
  });

  it("signIn 成功で authenticated へ遷移する", async () => {
    const user = userEvent.setup();
    getSessionMock.mockResolvedValue("unauthenticated");
    signInMock.mockResolvedValue({ kind: "ok" });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("unauthenticated");
    await user.click(screen.getByRole("button", { name: "in" }));
    expect(await screen.findByText("authenticated")).toBeInTheDocument();
  });

  it("signOut で unauthenticated へ遷移する", async () => {
    const user = userEvent.setup();
    getSessionMock.mockResolvedValue("authenticated");
    signOutMock.mockResolvedValue(undefined);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("authenticated");
    await user.click(screen.getByRole("button", { name: "out" }));
    expect(await screen.findByText("unauthenticated")).toBeInTheDocument();
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("useAuth を Provider 外で使うとエラーになる", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});
