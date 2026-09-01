import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";

export interface FrontendStackProps extends StackProps {
  /** CSP connect-src に追加する youtube-backup API のオリジン（例: https://api.example.com）。 */
  apiOrigin?: string;
  /** CSP connect-src に追加する Cognito オリジン（例: https://cognito-idp.ap-northeast-1.amazonaws.com）。 */
  cognitoOrigin?: string;
}

/**
 * 静的 SPA ホスティング（infrastructure-specification 準拠）:
 * - 非公開 S3（Block Public Access 全有効・バージョニング・SSE-S3）+ CloudFront OAC のみ許可
 * - CloudFront: SPA フォールバック（403/404 → /index.html, 200）、TLS1.2+、アクセスログ
 * - Response Headers Policy で CSP/HSTS/X-Content-Type-Options/Referrer-Policy/X-Frame-Options を付与
 * - CloudFront/S3 アクセスログ用の logging バケット（SSE-S3・ライフサイクル）
 */
export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps = {}) {
    super(scope, id, props);

    // アクセスログ保管バケット（CloudFront/S3 サーバーアクセスログの配信先）
    const logBucket = new s3.Bucket(this, "LogBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      lifecycleRules: [{ expiration: Duration.days(90) }],
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // 静的アセットの origin バケット（非公開・バージョニング）
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      serverAccessLogsBucket: logBucket,
      serverAccessLogsPrefix: "s3-access/",
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const connectSrc = ["'self'", props.apiOrigin, props.cognitoOrigin]
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .join(" ");

    // セキュリティヘッダ（security-design §2）
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "SecurityHeadersPolicy",
      {
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            override: true,
            contentSecurityPolicy: [
              "default-src 'self'",
              `connect-src ${connectSrc}`,
              "img-src 'self' data:",
              "media-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          contentTypeOptions: { override: true },
          referrerPolicy: {
            override: true,
            referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          },
          strictTransportSecurity: {
            override: true,
            accessControlMaxAge: Duration.days(730),
            includeSubdomains: true,
          },
          frameOptions: {
            override: true,
            frameOption: cloudfront.HeadersFrameOption.DENY,
          },
        },
      },
    );

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy,
      },
      // React Router のクライアントルーティングを成立させる SPA フォールバック
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: true,
      logBucket,
      logFilePrefix: "cloudfront-access/",
    });

    // デプロイワークフローが参照する出力
    this.exportValue(siteBucket.bucketName, { name: "SiteBucketName" });
    this.exportValue(distribution.distributionId, { name: "DistributionId" });
    this.exportValue(distribution.distributionDomainName, { name: "DistributionDomainName" });
  }
}
