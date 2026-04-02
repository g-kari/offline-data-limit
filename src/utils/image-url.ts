import type { ImageFormat } from "../types";

const IMAGE_API_BASE = "https://tools.0g0.xyz/api";

/**
 * HSL色相（0-360）を6桁HEX文字列に変換する（彩度100%、輝度50%固定）
 */
function hueToHex(hue: number): string {
  const h = hue / 60;
  const c = 255; // 彩度100%・輝度50%なのでC=1（255/255）
  const x = Math.round(c * (1 - Math.abs((h % 2) - 1)));
  let r = 0,
    g = 0,
    b = 0;
  if (h < 1) {
    [r, g, b] = [c, x, 0];
  } else if (h < 2) {
    [r, g, b] = [x, c, 0];
  } else if (h < 3) {
    [r, g, b] = [0, c, x];
  } else if (h < 4) {
    [r, g, b] = [0, x, c];
  } else if (h < 5) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }
  return [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/**
 * シミュレーション用の画像URLを生成する。
 * golden angleで色相を分散させ、インデックスごとに異なる背景色の一意なURLを返す。
 */
export function buildImageUrl(
  index: number,
  width: number,
  height: number,
  format: ImageFormat,
  quality?: number,
): string {
  // golden angle (137.508°) で色相を均等分散
  const hue = (index * 137.508) % 360;
  const bg = hueToHex(hue);
  const params = new URLSearchParams({ w: String(width), h: String(height), bg, text: "ffffff" });
  if (format === "jpg" && quality !== undefined) {
    params.set("q", String(quality));
  }
  return `${IMAGE_API_BASE}/image.${format}?${params.toString()}`;
}
