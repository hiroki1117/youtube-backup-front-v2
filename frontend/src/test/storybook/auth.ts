import type { AuthApi, AuthResult, SessionStatus } from "@/api/auth";

/**
 * Storybook 用の AuthApi スタブ（R-01 / OQ4）。
 * Storybook + MSW はネットワーク層しか差し替えられないため、Cognito SDK を直接呼ぶ `authModule` は
 * `AuthProvider` の `authApi` prop（依存注入）でこのスタブに置き換える。
 * 実 Cognito・実認証情報には一切触れない（合成値のみ）。
 */
export interface StubAuthApiOptions {
  /** `getSession()` が即時解決するセッション状態。 */
  status: SessionStatus;
  /** `signIn()` の戻り値。省略時は成功（`{ kind: "ok" }`）。 */
  signInResult?: AuthResult;
}

export function createStubAuthApi({ status, signInResult }: StubAuthApiOptions): AuthApi {
  return {
    getSession: () => Promise.resolve(status),
    signIn: () => Promise.resolve(signInResult ?? { kind: "ok" }),
    signOut: () => Promise.resolve(),
  };
}
