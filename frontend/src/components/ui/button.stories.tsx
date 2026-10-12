import type { Meta, StoryObj } from "@storybook/react-vite";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

/** shadcn/ui Button の variant / size / 状態バリアント（US-2）。 */
const meta = {
  title: "UI/Button",
  component: Button,
  args: {
    children: "ボタン",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = {
  args: { variant: "secondary" },
};

export const Outline: Story = {
  args: { variant: "outline" },
};

export const Ghost: Story = {
  args: { variant: "ghost" },
};

export const Destructive: Story = {
  args: { variant: "destructive", children: "削除する" },
};

export const Link: Story = {
  args: { variant: "link", children: "詳細を見る" },
};

export const Small: Story = {
  args: { size: "sm" },
};

export const Large: Story = {
  args: { size: "lg" },
};

/** アイコンのみのボタン。視覚ラベルが無いため `aria-label` を必須とする（AppShell の各アクションと同形）。 */
export const Icon: Story = {
  args: {
    size: "icon",
    variant: "ghost",
    "aria-label": "動画を検索",
    children: <Search className="h-4 w-4" aria-hidden="true" />,
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/** 送信中表現: `disabled` + `aria-busy` + 「…中」文言（LoginPage / RegisterDialog の送信ボタンと同形）。 */
export const Loading: Story = {
  args: {
    disabled: true,
    "aria-busy": true,
    children: "ログイン中...",
  },
};
