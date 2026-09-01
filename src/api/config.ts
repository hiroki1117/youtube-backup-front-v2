/**
 * 実行時構成（すべて VITE_* 環境変数から注入。ハードコード禁止）。
 * これらは公開前提の構成値（機密ではない）。真の機密はフロントに置かない。
 */
export interface AppConfig {
  apiBaseUrl: string;
  cognito: {
    userPoolId: string;
    clientId: string;
    region: string;
  };
}

export const config: AppConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? "",
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? "",
    region: import.meta.env.VITE_COGNITO_REGION ?? "",
  },
};
