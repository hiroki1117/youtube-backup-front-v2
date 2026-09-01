#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { FrontendStack } from "../lib/frontend-stack";

const app = new App();

// CSP connect-src の allowlist に用いる公開オリジン（機密ではない構成値）。
// context で上書き可能: cdk deploy -c apiOrigin=https://... -c cognitoOrigin=https://cognito-idp.<region>.amazonaws.com
new FrontendStack(app, "YoutubeBackupFrontV2", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  apiOrigin: app.node.tryGetContext("apiOrigin"),
  cognitoOrigin: app.node.tryGetContext("cognitoOrigin"),
});
