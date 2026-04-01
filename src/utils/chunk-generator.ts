/**
 * ランダムデータのチャンクを生成する
 * crypto.getRandomValues() を使用し、圧縮最適化を防ぐ
 */
export function generateChunk(sizeBytes: number): Uint8Array {
  const chunk = new Uint8Array(sizeBytes);
  // getRandomValues は最大65536バイトしか一度に処理できないため分割する
  const maxChunk = 65536;
  for (let offset = 0; offset < sizeBytes; offset += maxChunk) {
    const remaining = Math.min(maxChunk, sizeBytes - offset);
    crypto.getRandomValues(chunk.subarray(offset, offset + remaining));
  }
  return chunk;
}

/**
 * localStorage/sessionStorage 用の文字列データを生成する
 * Base64エンコードで1文字≒0.75バイト相当
 */
export function generateStringChunk(sizeBytes: number): string {
  const bytes = generateChunk(Math.ceil(sizeBytes * 0.75));
  return btoa(String.fromCharCode(...bytes)).substring(0, sizeBytes);
}
