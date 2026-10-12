import type { Meta, StoryObj } from "@storybook/react-vite";
import { VideoPlaybackPage } from "@/app/VideoPlaybackPage";
import { makeVideoEnvelope, videoNotFoundEnvelope } from "@/test/handlers";
import { withAppRoutes } from "@/test/storybook/decorators";
import {
  networkErrorHandler,
  pendingHandler,
  presignedErrorHandler,
  videoHandler,
} from "@/test/storybook/msw";

/**
 * 動画再生ページ（US-3 中核 / US-6 / US-11）。
 * `withAppRoutes` が実ルート定義（RequireAuth → AppShell → VideoPlaybackPage）を `/videos/v1` で描画する。
 * 署名 URL は Storybook 専用の `.invalid` ドメイン（`src/test/storybook/msw.ts`）で、`<video>` の
 * メディア要求も MSW が受け止めるため実ネットワークへは出ない（再生自体は行われない）。
 */
const meta = {
  title: "Pages/VideoPlaybackPage",
  component: VideoPlaybackPage,
  decorators: [withAppRoutes],
  parameters: {
    layout: "fullscreen",
    auth: "authenticated",
    router: { initialEntries: ["/videos/v1"] },
  },
} satisfies Meta<typeof VideoPlaybackPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定ハンドラ: complete 動画 + 署名 URL 成功 → `<video>` + ダウンロード + 詳細。 */
export const Detail: Story = {};

export const Loading: Story = {
  parameters: {
    msw: { handlers: [pendingHandler("get", "/video/:videoId")] },
  },
};

/** 詳細取得のネットワーク失敗（transport）→ error フォールバック + 再試行。 */
export const Error: Story = {
  parameters: {
    msw: { handlers: [networkErrorHandler("get", "/video/:videoId")] },
  },
};

/** 未存在（description「Dynamoに情報がない」→ notFound）。 */
export const NotFound: Story = {
  parameters: {
    msw: { handlers: [videoHandler(videoNotFoundEnvelope())] },
  },
};

/** `upload_status: init` → 再生・ダウンロード不可（A3）。詳細のみ表示。 */
export const NotPlayable: Story = {
  parameters: {
    msw: {
      handlers: [
        videoHandler(
          makeVideoEnvelope({
            video_id: "v1",
            title: "処理中の動画",
            upload_status: "init",
            backupdate: "2026-07-20",
          }),
        ),
      ],
    },
  },
};

/** 詳細は成功、署名 URL 取得が失敗（真の partial 状態）→ プレイヤー領域が error + 再試行。 */
export const SourceError: Story = {
  parameters: {
    msw: { handlers: [presignedErrorHandler()] },
  },
};
