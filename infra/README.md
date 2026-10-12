# 保全中の CDK scaffold

このディレクトリは既存の S3 / CloudFront CDK scaffold。live との対応・所有者は未確認であり、適用・削除しない。
AWS 定義と state の管理先は [hiroki1117/infra](https://github.com/hiroki1117/infra)。
app の build / CI / deploy.yml から CDK は呼び出さない。既存 deploy.yml は Actions Variables に指定された配布先を使い、この scaffold の適用を前提としない。

source / package.json / cdk.json は保全した。整理は stack/resource/state と管理元の照合後に行う。
[所有境界と切替条件](../docs/migration.md) を参照。
