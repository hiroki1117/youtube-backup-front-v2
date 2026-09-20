import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "@/components/ui/input";

/** shadcn/ui Input の状態バリアント（US-2）。単体表示のため `aria-label` でアクセシブル名を与える。 */
const meta = {
  title: "UI/Input",
  component: Input,
  args: {
    "aria-label": "入力欄",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { defaultValue: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
};

export const Placeholder: Story = {
  args: { placeholder: "https://www.youtube.com/watch?v=..." },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "編集できません" },
};

/** バリデーション失敗時の表現（RegisterDialog / SearchDialog は `aria-invalid` を付ける）。 */
export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "not-a-url" },
};

export const Password: Story = {
  args: { type: "password", defaultValue: "correct-horse-battery-staple" },
};
