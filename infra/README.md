# infra — S3 + CloudFront (AWS CDK)

`youtube-backup-front-v2` を配信する静的ホスティングの IaC（`infrastructure-specification.md` 準拠）。

- **構成**: 非公開 S3（Block Public Access 全有効・バージョニング・SSE-S3）+ CloudFront（OAC のみ許可）。
- **SPA フォールバック**: 403/404 → `/index.html`（200）で React Router のクライアントルーティングを成立させる。
- **セキュリティヘッダ**: CloudFront Response Headers Policy で CSP / HSTS / X-Content-Type-Options /
  Referrer-Policy / X-Frame-Options を付与（`security-design.md` §2）。
- **ログ**: CloudFront アクセスログ + S3 サーバーアクセスログを logging バケットへ保管。

## 注意（単一 lockfile 方針）

このディレクトリはアプリ本体（リポジトリ直下）とは**別プロジェクト**の scaffold であり、
アプリの `pnpm-lock.yaml` には含めない。CDK は運用側で一度だけプロビジョニングする想定のため、
本ディレクトリでは依存インストール（lockfile 生成）を行っていない。プロビジョニング時に別途:

```bash
cd infra
pnpm install   # または npm install（このディレクトリ内で完結。リポジトリ直下と lockfile を共存させない）
pnpm cdk deploy \
  -c apiOrigin=https://<api-origin> \
  -c cognitoOrigin=https://cognito-idp.<region>.amazonaws.com
```

## デプロイ連携

CI/CD（`.github/workflows/deploy.yml`）は本スタックが出力する以下を GitHub Actions Variables に設定して使う:

- `S3_BUCKET` ← `SiteBucketName`
- `CLOUDFRONT_DISTRIBUTION_ID` ← `DistributionId`

デプロイ用 IAM role は GitHub OIDC で AssumeRole する。trust policy の `sub` 条件を
`repo:<org>/<repo>:ref:refs/heads/main` に絞り、S3 put / CloudFront invalidation の最小権限に限定すること。
