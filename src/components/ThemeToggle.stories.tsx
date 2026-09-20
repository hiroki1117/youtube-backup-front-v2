import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeToggle } from "@/components/ThemeToggle";
import { withTheme } from "@/test/storybook/decorators";

/**
 * テーマ切替ボタン（US-2 / US-4）。ThemeProvider のみを最小 Provider として付与する。
 * ボタン操作は ThemeProvider 経由で `<html data-theme>` を切り替える（ツールバーのグローバル
 * テーマ切替とは独立。ツールバー操作時は Story が再マウントされ Provider の状態も追従する）。
 */
const meta = {
  title: "Components/ThemeToggle",
  component: ThemeToggle,
  decorators: [withTheme],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
