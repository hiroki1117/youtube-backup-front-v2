import type { Meta, StoryObj } from "@storybook/react-vite";
import { VideoDetail } from "@/components/VideoDetail";
import { makeVideo } from "@/test/factories";

/** 動画詳細（VideoPlaybackPage から抽出した presentational）（US-6）。 */
const meta = {
  title: "Components/VideoDetail",
  component: VideoDetail,
  args: {
    video: makeVideo(),
  },
} satisfies Meta<typeof VideoDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Complete: Story = {};

export const Init: Story = {
  args: {
    video: makeVideo({
      videoId: "i1",
      title: "処理中の動画",
      uploadStatus: "init",
      backupDate: "2026-07-20",
    }),
  },
};
