import { parseHttpsUrl } from "@/lib/url";

/**
 * 署名 URL からのダウンロード起動（U6 video-playback / FR6.2・NFR4）。
 * 署名 URL を安全に検証してから `<a download>` を生成しクリックし、ブラウザのダウンロードを起動する。
 * https 検証は `parseHttpsUrl`（url.ts）に一元化し、非 https（http / javascript: 等）は開かない
 * （タブナビング・スキーム injection 対策）。生成する `<a>` には `rel="noopener noreferrer"` を必ず付与する
 * （クロスオリジンで `download` 属性が無効化され新規タブ遷移になった場合の tabnabbing も防ぐ / NFR4）。
 *
 * レイヤ境界: leaf lib（副作用は DOM 操作のみ。api/hooks/components に依存しない）。
 */

/**
 * 署名 URL のダウンロードを起動する。
 * @param url 署名 URL（https のみ許可）
 * @param filename ダウンロードファイル名のヒント（省略時はブラウザ既定＝URL 由来）
 * @returns https として検証でき起動した場合 true、非 https 等で拒否した場合 false
 */
export function downloadPresignedUrl(url: string, filename?: string): boolean {
  const parsed = parseHttpsUrl(url);
  if (parsed === null) {
    // 非 https・空・URL 構文不正はダウンロードしない（NFR4）。呼び出し側は false を受けて通知する。
    return false;
  }
  const anchor = document.createElement("a");
  anchor.href = parsed.href;
  // タブナビング対策。download が有効ならナビゲーションは発生しないが、
  // クロスオリジンで download が無効化された場合の新規タブ遷移に備えて必ず付与する（NFR4）。
  anchor.rel = "noopener noreferrer";
  anchor.download = filename !== undefined && filename.trim() !== "" ? filename : "";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return true;
}
