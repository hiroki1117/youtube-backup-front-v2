import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";
import { config } from "./config";

/**
 * AuthModule（contract C5 / security-design §1）。
 * amazon-cognito-identity-js を直接使い USER_SRP_AUTH（SRP、パスワード平文非送信）でログインする。
 * UI 層へは discriminated union の型付き失敗値（AuthResult）を返し、例外を投げない。
 * API 呼び出しには認証ヘッダを付与しない（バックエンド未認証、C1/C2）。
 */

export type AuthResult =
  | { kind: "ok" }
  | { kind: "invalidCredentials"; message: string }
  | { kind: "transport"; message: string };

export type SessionStatus = "authenticated" | "unauthenticated";

export interface AuthApi {
  getSession(): Promise<SessionStatus>;
  signIn(username: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
}

interface ErrInfo {
  code: string;
  message: string;
}

/** Cognito エラーオブジェクトから code / message を安全に取り出す（as 不使用）。 */
function readError(err: unknown): ErrInfo {
  let code = "";
  let message = "認証に失敗しました";
  if (typeof err === "object" && err !== null) {
    if ("code" in err && typeof err.code === "string") {
      code = err.code;
    }
    if (!code && "name" in err && typeof err.name === "string") {
      code = err.name;
    }
    if ("message" in err && typeof err.message === "string") {
      message = err.message;
    }
  }
  return { code, message };
}

// 認証情報の誤りとして扱う Cognito エラーコード（それ以外は transport 扱い）。
const CREDENTIAL_ERROR_CODES = new Set([
  "NotAuthorizedException",
  "UserNotFoundException",
  "UserNotConfirmedException",
  "PasswordResetRequiredException",
]);

export class CognitoAuthModule implements AuthApi {
  /** Pool は遅延生成（モジュール import 時に構成不足で throw させない）。 */
  private getUserPool(): CognitoUserPool {
    return new CognitoUserPool({
      UserPoolId: config.cognito.userPoolId,
      ClientId: config.cognito.clientId,
    });
  }

  async getSession(): Promise<SessionStatus> {
    const currentUser = this.getUserPool().getCurrentUser();
    if (!currentUser) {
      return "unauthenticated";
    }
    return new Promise<SessionStatus>((resolve) => {
      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve("unauthenticated");
        } else {
          resolve("authenticated");
        }
      });
    });
  }

  async signIn(username: string, password: string): Promise<AuthResult> {
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: this.getUserPool(),
    });
    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });
    return new Promise<AuthResult>((resolve) => {
      // authenticateUser は既定で USER_SRP_AUTH フローを用いる。
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: () => resolve({ kind: "ok" }),
        onFailure: (err: unknown) => {
          const { code, message } = readError(err);
          if (CREDENTIAL_ERROR_CODES.has(code)) {
            resolve({ kind: "invalidCredentials", message });
          } else {
            resolve({ kind: "transport", message });
          }
        },
        newPasswordRequired: () =>
          resolve({
            kind: "invalidCredentials",
            message: "パスワードの再設定が必要です。管理者に連絡してください。",
          }),
      });
    });
  }

  async signOut(): Promise<void> {
    const currentUser = this.getUserPool().getCurrentUser();
    currentUser?.signOut();
  }
}

/** アプリ全体で共有する AuthModule 実体。 */
export const authModule: AuthApi = new CognitoAuthModule();
