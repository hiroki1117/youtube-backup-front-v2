import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authModule, type AuthApi, type AuthResult, type SessionStatus } from "@/api/auth";

/**
 * 認証状態プロバイダ（functional-spec SM1 / security-design §1）。
 * 起動時はセッション復元を試み、確定まで `unknown`（RequireAuth は loading 表示）。
 * 認証 API は `authApi` prop で注入できる（既定は Cognito 実装 `authModule`。本番挙動は不変）。
 * Storybook / テストはここにスタブを渡し、Cognito SDK へ到達させない（R-01 依存注入）。
 */
export type AuthState = "unknown" | SessionStatus;

interface AuthContextValue {
  status: AuthState;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
  /** 認証 API の注入口。省略時は `authModule`（Cognito）。 */
  authApi?: AuthApi;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, authApi = authModule }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthState>("unknown");

  const refresh = useCallback(async () => {
    const next = await authApi.getSession();
    setStatus(next);
  }, [authApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (username: string, password: string): Promise<AuthResult> => {
      const result = await authApi.signIn(username, password);
      if (result.kind === "ok") {
        setStatus("authenticated");
      }
      return result;
    },
    [authApi],
  );

  const signOut = useCallback(async (): Promise<void> => {
    await authApi.signOut();
    setStatus("unauthenticated");
  }, [authApi]);

  return (
    <AuthContext.Provider value={{ status, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth は AuthProvider の内側で使用してください");
  }
  return ctx;
}
