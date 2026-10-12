import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** shadcn/ui Label（Radix Label）（US-2）。 */
const meta = {
  title: "UI/Label",
  component: Label,
  args: {
    children: "動画 URL",
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `htmlFor` で Input と関連付けた形（フォームでの実使用形）。 */
export const WithInput: Story = {
  args: { htmlFor: "label-story-input" },
  render: (args) => (
    <div className="space-y-2">
      <Label {...args} />
      <Input id="label-story-input" placeholder="https://www.youtube.com/watch?v=..." />
    </div>
  ),
};
