import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CatalogControls } from "@/components/CatalogControls";

/** 一覧操作コントロール（状態フィルタ / ソート順 / 手動更新）（US-2）。 */
const meta = {
  title: "Components/CatalogControls",
  component: CatalogControls,
  args: {
    uploadStatus: "complete",
    sortOrder: "desc",
    isFetching: false,
    onFilterChange: fn(),
    onSortToggle: fn(),
    onRefresh: fn(),
  },
} satisfies Meta<typeof CatalogControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InitFilter: Story = {
  args: { uploadStatus: "init" },
};

export const AscSort: Story = {
  args: { sortOrder: "asc" },
};

/** 再取得中は更新ボタンが無効化される。 */
export const Fetching: Story = {
  args: { isFetching: true },
};
