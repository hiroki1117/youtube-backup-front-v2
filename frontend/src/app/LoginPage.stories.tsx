import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import { LoginPage } from "@/app/LoginPage";
import { withAppRoutes } from "@/test/storybook/decorators";

/**
 * ログインページ（US-3 / US-11 / OQ4）。
 * 認証は `AuthProvider` に注入した AuthApi スタブ（`parameters.auth`）で完結し、Cognito へは到達しない。
 * `play` は「状態セットアップ専用」（入力・送信のみ、assertion なし）。
 */
const meta = {
  title: "Pages/LoginPage",
  component: LoginPage,
  decorators: [withAppRoutes],
  parameters: {
    layout: "fullscreen",
    auth: "unauthenticated",
    router: { initialEntries: ["/login"] },
  },
} satisfies Meta<typeof LoginPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 未入力で送信 → フォーム上部にバリデーションエラー。 */
export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));
  },
};

/** スタブの signIn が invalidCredentials を返す → error トースト + フォーム上部 error + パスワードクリア。 */
export const SubmitError: Story = {
  parameters: {
    auth: {
      status: "unauthenticated",
      signInResult: {
        kind: "invalidCredentials",
        message: "ユーザー名またはパスワードが正しくありません。",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("ユーザー名"), "storybook-user");
    await userEvent.type(canvas.getByLabelText("パスワード"), "wrong-password");
    await userEvent.click(canvas.getByRole("button", { name: "ログイン" }));
  },
};
