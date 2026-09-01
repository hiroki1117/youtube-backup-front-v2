# youtube-backup-front-v2

`youtube-backup` のフロントエンド刷新（v2）。旧 CRA + React 17 + Amplify + Redux スタックを、
モダンな Vite + React 18 + TypeScript strict へ置き換える。本リポジトリの U1（app-foundation / walking skeleton）は
共通基盤（認証・API アクセス層・ドメイン型・状態表示/テーマ・ルーティング）とテスト/CI 土台を確立する。

## 技術スタック

| 領域         | 採用                                                                           |
| ------------ | ------------------------------------------------------------------------------ |
| ビルド/言語  | Vite 5 + React 18 + TypeScript strict + pnpm                                   |
| UI           | shadcn/ui + Tailwind CSS                                                       |
| ルーティング | React Router v6（`createBrowserRouter`）+ `RequireAuth`                        |
| サーバー状態 | TanStack Query + 単一 fetch ラッパ（`ApiResult<T>` 正規化）                    |
| 認証         | `amazon-cognito-identity-js`（USER_SRP_AUTH）                                  |
| テスト       | Vitest + React Testing Library + MSW + `@vitest/coverage-v8`（line 80% floor） |
| 品質         | ESLint flat config + Prettier + husky/lint-staged                              |

## ディレクトリ構成（レイヤ一方向依存: `components → hooks → api → types`）

```
src/
  types/       ドメイン型（Video / UploadStatus / parseVideo） … C3 VideoModel
  api/         唯一の HTTP 境界（client.ts=ApiClient/C2, auth.ts=AuthModule, config.ts）
  hooks/       useAuth（AuthProvider）/ useTheme（ThemeProvider）/ useVideos
  components/  StatusView(C4) / AppShell(C5) / RequireAuth / ThemeToggle / Toaster / ui(shadcn)
  app/         LoginPage / VideosPage / routes（画面・ルート定義）
  lib/         cn / openExternalUrl / notify / ROUTES（共有 leaf ユーティリティ）
  test/        MSW server/handlers・factories・setup
infra/         S3 + CloudFront(OAC) の AWS CDK スタック（別プロジェクト scaffold）
```

逆流は ESLint `import/no-cycle`（error）で機械的に禁止する。

## 前提

- Node.js 20 以上、pnpm（`packageManager` フィールドで版固定 / corepack）。

## セットアップ

```bash
corepack enable
pnpm install
cp .env.example .env   # 値を設定（VITE_* のみクライアントへ公開される）
```

環境変数（すべて `VITE_*`、ハードコード禁止）:

| 変数                        | 用途                                 |
| --------------------------- | ------------------------------------ |
| `VITE_API_BASE_URL`         | youtube-backup REST API のベース URL |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID                 |
| `VITE_COGNITO_CLIENT_ID`    | Cognito App Client ID                |
| `VITE_COGNITO_REGION`       | Cognito リージョン                   |

## 開発コマンド

```bash
pnpm dev            # 開発サーバー
pnpm build          # tsc --noEmit && vite build（本番ビルド）
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint .
pnpm format:check   # prettier --check .
pnpm test           # vitest run --coverage（全テスト、line 80% floor）

# U1（app-foundation）に限定したテスト実行:
pnpm vitest run src/types src/api src/hooks src/components src/app --coverage
```

## CI / デプロイ

- **CI**（`.github/workflows/ci.yml`, PR/`main`）: frozen-lockfile → typecheck → lint → format → test+coverage → build。
  いずれか失敗で merge ブロック（team-practices）。
- **Deploy**（`.github/workflows/deploy.yml`, `main` マージ）: `vite build` → S3 sync（ハッシュ資産は immutable、
  `index.html` は no-cache）→ CloudFront invalidation（`/index.html`）。認証は GitHub OIDC → IAM role。
  バケット名・distribution ID は Actions Variables/Secrets で注入（ハードコードなし）。
- **依存自動更新**（`.github/dependabot.yml`）: 週次（NFR5.1）。
- **インフラ**（`infra/`）: S3 + CloudFront(OAC) + Response Headers Policy（CSP/HSTS 等）+ SPA フォールバック（AWS CDK）。

## スコープ（U1 walking skeleton）

本 Bolt は「モダンスタック確立 + テスト/CI 土台 + 認証〜一覧の最小疎通」を達成する。
一覧のフィルタ/ソート/ページング、検索・登録・削除・再生は後続ユニット（U2〜U6）で実装する。
