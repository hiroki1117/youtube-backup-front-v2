import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseHttpsUrl } from "@/lib/url";

/** Tailwind クラスを条件付きで結合し衝突を解決する（shadcn/ui 標準ユーティリティ）。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * 外部/署名 URL を安全に開く（team code style: https 検証 + noopener,noreferrer）。
 * https スキーム以外は開かず false を返す（タブナビング・スキーム injection 対策）。
 * https 検証は `parseHttpsUrl`（url.ts）に一元化し、登録フォームの検証と共通化する。
 */
export function openExternalUrl(url: string): boolean {
  const parsed = parseHttpsUrl(url);
  if (parsed === null) {
    return false;
  }
  window.open(parsed.href, "_blank", "noopener,noreferrer");
  return true;
}
