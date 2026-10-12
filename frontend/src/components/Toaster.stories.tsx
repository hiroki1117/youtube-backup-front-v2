import { useEffect, useRef } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toaster } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import { notify, type NotifyKind } from "@/lib/notify";

/**
 * 通知（トースト）（US-2 / OQ2）。
 * `Toaster` は `lib/notify` シングルトンを購読するだけで Provider 不要。Story ごとの状態リークは
 * `.storybook/preview.tsx` のグローバル notify リセット（`clearNotifications()`）が防ぐため、
 * ここでは mount 時に `notify()` を発火して表示状態を作る。
 */
interface ToasterDemoProps {
  /** mount 時に発火する通知。 */
  initial: Array<{ kind: NotifyKind; message: string }>;
}

function ToasterDemo({ initial }: ToasterDemoProps) {
  // StrictMode / 再描画での二重発火を防ぐ（mount 時に 1 回だけ）。
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) {
      return;
    }
    fired.current = true;
    for (const notification of initial) {
      notify(notification.kind, notification.message);
    }
  }, [initial]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        右下にトーストが表示されます。ボタンで追加発火できます。
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => notify("success", "バックアップを開始しました: サンプル動画")}
        >
          success
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => notify("info", "既にバックアップ済みです: サンプル動画")}
        >
          info
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => notify("error", "通信に失敗しました。時間をおいて再試行してください。")}
        >
          error
        </Button>
      </div>
      <Toaster />
    </div>
  );
}

const meta = {
  title: "Components/Toaster",
  component: Toaster,
  render: (args) => <ToasterDemo {...args} />,
} satisfies Meta<ToasterDemoProps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    initial: [{ kind: "success", message: "バックアップを開始しました: サンプル動画" }],
  },
};

export const Error: Story = {
  args: {
    initial: [{ kind: "error", message: "通信に失敗しました。時間をおいて再試行してください。" }],
  },
};

export const Info: Story = {
  args: {
    initial: [{ kind: "info", message: "既にバックアップ済みです: サンプル動画" }],
  },
};

export const Multiple: Story = {
  args: {
    initial: [
      { kind: "success", message: "バックアップを開始しました: 完了動画1" },
      { kind: "info", message: "既にバックアップ済みです: 完了動画2" },
      { kind: "error", message: "バックアップ中のため削除できません" },
    ],
  },
};
