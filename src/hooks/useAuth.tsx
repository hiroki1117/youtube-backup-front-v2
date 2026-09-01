import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authModule, type AuthResult, type SessionStatus } from "@/api/auth";

/**
 * 認証状態プロバイダ（functional-spec SM1 / security-design §1）。
 * 起動時はセッション復元を試み、確定まで `unknown`（RequireAuth は loading 表示）。
 */
export type AuthState = "unknown" | SessionStatus;

interface AuthContextValue {
  status: AuthState;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState>("unknown");

  const refresh = useCallback(async () => {
    const next = await authModule.getSession();
    setStatus(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    const result = await authModule.signIn(username, password);
    if (result.kind === "ok") {
      setStatus("authenticated");
    }
    return result;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await authModule.signOut();
    setStatus("unauthenticated");
  }, []);

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
