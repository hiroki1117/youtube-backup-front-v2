import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVideoRegistration } from "@/hooks/useVideoRegistration";
import { validateVideoUrl } from "@/lib/url";

/**
 * 動画登録ダイアログ（U4 video-registration / US4.1）。
 * URL 入力 → クライアント検証（NFR4）→ 登録フック（useVideoRegistration）へ送信。
 * 送信中は送信ボタンを無効化して二重送信を抑止し、登録受理で自動的に閉じる。
 *
 * 表示専用に近い presentational で、副作用は登録フック（hooks 層）に委譲する。
 * 制御フローは boolean 状態と discriminated union で表現し、表示テキストでは分岐しない。
 */

export interface RegisterDialogProps {
  /** 表示状態。false のときは何も描画しない。 */
  open: boolean;
  /** 閉じる要求（キャンセル・登録受理時）。開閉状態の所有は親（AppShell/app 層）。 */
  onClose: () => void;
}

export function RegisterDialog({ open, onClose }: RegisterDialogProps) {
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  // 登録受理（ok）でダイアログを閉じる。エラー時は開いたまま再入力させる。
  const { submit, isSubmitting } = useVideoRegistration({ onRegistered: onClose });

  // 閉じたら入力とエラーを初期化し、次回オープン時にクリーンな状態にする。
  // effect 内 setState を避け、prop 変化時にレンダー中で state を調整する（React 推奨パターン）。
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setUrl("");
      setValidationError(null);
    }
  }

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateVideoUrl(url);
    if (!validation.ok) {
      // クライアント検証失敗: API を叩かずフォーム内にエラー表示（サーバー往復回避 / NFR4）。
      setValidationError(validation.reason);
      return;
    }
    setValidationError(null);
    submit(validation.url);
  };

  const hasError = validationError !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-dialog-title"
        className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg"
      >
        <h2 id="register-dialog-title" className="text-lg font-semibold">
          動画を登録
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4" aria-label="動画登録フォーム">
          <div className="space-y-2">
            <Label htmlFor="register-url">動画 URL</Label>
            <Input
              id="register-url"
              type="text"
              inputMode="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              aria-invalid={hasError}
              aria-describedby={hasError ? "register-url-error" : undefined}
            />
            {hasError && (
              <p id="register-url-error" role="alert" className="text-sm text-destructive">
                {validationError}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              登録
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
