# YouTube Backup — アプリ統合の初期整備

現在の repo 名は `youtube-backup-front-v2`。将来 `youtube-backup-v2` へ改名する。
[統合 Issue #41](https://github.com/hiroki1117/projects/issues/41) の準備段階であり、本番の切替は未完了。
Nx 等は追加せず、各ディレクトリの標準ツールと Make で開発・検証する。

| ディレクトリ      | 内容・状態                                                                    |
| ----------------- | ----------------------------------------------------------------------------- |
| `frontend/`       | 既存 Vite / React / TypeScript / pnpm アプリ。コードは移動のみ                |
| `backend/lambda/` | 旧 `youtube-backup` の Python Lambda 9件。live 未照合の移管ソース             |
| `batch/scripts/`  | 同 repo の download / upload / whisper / 保守スクリプト。配布は旧 repo が継続 |
| `infra/`          | 既存 CDK scaffold を保全。所有確認前に適用・削除しない                        |

`youtube_backup2` はインフラ用でアプリの移管元ではない。`youtube-backup-front` は旧 CRA 実装で、今回取り込まない。
移管元 SHA・ファイル SHA256 は [source-manifest.json](docs/source-manifest.json)、境界と移行手順は [migration.md](docs/migration.md) を参照。

## 開発・検証

Node.js 20 以上、`pnpm@10.34.5`（`frontend/package.json`）、Python 3、Make、shell を使用する。
Docker は batch のローカル image build にのみ必要。

```bash
corepack enable
make install
cp frontend/.env.example frontend/.env # 公開 VITE_* 構成値を設定
pnpm --dir frontend dev
make check # frontend 型・lint・format・既存テスト、backend/batch 構文
make build # frontend と Storybook
```

各部分を独立に実行できる:

```bash
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend build
make -C backend check
make -C backend package # build/candidates のソースのみ ZIP。配布禁止・依存未同梱
make -C batch check
make -C batch build IMAGE=yt-dlp-script TAG=youtube-backup-candidate:local
```

frontend のレイヤは `components → hooks → api → types`。
Storybook は `pnpm --dir frontend storybook`。`.env` は frontend 内から読み込む。
`VITE_API_BASE_URL`、`VITE_COGNITO_USER_POOL_ID`、`VITE_COGNITO_CLIENT_ID`、`VITE_COGNITO_REGION` はクライアント公開値。

## CI・配布

既存 CI は frontend の型・lint・format・coverage（line 80%）・build・Storybook を継続し、backend/batch の非実行構文検査を加える。
既存 `deploy.yml` の main push / 手動実行、production environment、OIDC、S3/CloudFront 配布先を維持し、実行ディレクトリを frontend に変更した。
本番成果物は `frontend/dist/` のみ。Storybook / candidate ZIP / batch は配布しない。
既存 workflow の停止・起動や Actions 設定変更は実施していない。

backend/batch の新しい本番 workflow は作成しない。旧 image CI が SHA / `latest` を push する間、この repo から同じ ECR へ push しない。
AWS 定義・state は `hiroki1117/infra` の責務。Lambda/Batch の配布切替、repo 改名、OIDC/外部連携の変更は別の承認段階。
Lambdalith 化・runtime 更新・依存変更・image digest 固定化は今回と分ける。
