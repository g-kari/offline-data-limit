import type { DataType } from "../types";

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
  // 8192バイトずつ変換して文字列連結のO(n²)を回避し、スタックオーバーフローも防ぐ
  const CONVERT_CHUNK = 8192;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CONVERT_CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CONVERT_CHUNK)));
  }
  return btoa(parts.join("")).substring(0, sizeBytes);
}

/**
 * BMPヘッダー + ランダムピクセルデータでBMPバイナリを生成する
 * 24bpp, 幅256px固定、高さはデータサイズから計算
 */
export function generateBmpChunk(sizeBytes: number): Uint8Array {
  const HEADER_SIZE = 54;
  if (sizeBytes <= HEADER_SIZE) return generateChunk(sizeBytes);

  const pixelDataSize = sizeBytes - HEADER_SIZE;
  const width = 256;
  const rowSize = Math.ceil((width * 3) / 4) * 4; // 4バイトアライン
  const height = Math.max(1, Math.floor(pixelDataSize / rowSize));
  const actualPixelSize = rowSize * height;
  const actualSize = HEADER_SIZE + actualPixelSize;

  const buf = new Uint8Array(actualSize);
  const view = new DataView(buf.buffer);

  // BMPファイルヘッダー (14B)
  buf[0] = 0x42;
  buf[1] = 0x4d; // "BM"
  view.setUint32(2, actualSize, true); // ファイルサイズ
  view.setUint32(6, 0, true); // 予約済み
  view.setUint32(10, HEADER_SIZE, true); // ピクセルデータオフセット

  // DIBヘッダー (40B)
  view.setUint32(14, 40, true); // ヘッダーサイズ
  view.setInt32(18, width, true); // 幅
  view.setInt32(22, height, true); // 高さ
  view.setUint16(26, 1, true); // カラープレーン数
  view.setUint16(28, 24, true); // bpp
  view.setUint32(30, 0, true); // 圧縮なし
  view.setUint32(34, actualPixelSize, true); // ピクセルデータサイズ

  // ピクセルデータをランダムで埋める
  const pixelData = buf.subarray(HEADER_SIZE, HEADER_SIZE + actualPixelSize);
  const maxChunk = 65536;
  for (let offset = 0; offset < pixelData.length; offset += maxChunk) {
    const slice = pixelData.subarray(offset, Math.min(offset + maxChunk, pixelData.length));
    crypto.getRandomValues(slice);
  }

  return buf;
}

/** 日本語テキストを繰り返してUTF-8 Uint8Arrayを生成する */
export function generateTextChunk(sizeBytes: number): Uint8Array {
  const template =
    "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 \n";
  const encoder = new TextEncoder();
  const templateBytes = encoder.encode(template);
  const result = new Uint8Array(sizeBytes);
  let offset = 0;
  while (offset < sizeBytes) {
    const remaining = sizeBytes - offset;
    const toCopy = Math.min(templateBytes.length, remaining);
    result.set(templateBytes.subarray(0, toCopy), offset);
    offset += toCopy;
  }
  return result;
}

/** 構造化JSONオブジェクトの配列をUTF-8 Uint8Arrayで生成する */
export function generateJsonChunk(sizeBytes: number): Uint8Array {
  const encoder = new TextEncoder();
  const item = JSON.stringify({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    name: "ベンチマークデータ",
    value: Math.random() * 1000,
    tags: ["storage", "benchmark", "test"],
    description: "ブラウザストレージ限度計測用のサンプルJSONデータ",
  });
  const itemBytes = encoder.encode(item + ",");
  const result = new Uint8Array(sizeBytes);
  // [ で始まり繰り返すJSON配列
  result[0] = 0x5b; // "["
  let offset = 1;
  while (offset + itemBytes.length < sizeBytes - 1) {
    result.set(itemBytes, offset);
    offset += itemBytes.length;
  }
  result[sizeBytes - 1] = 0x5d; // "]"
  return result;
}

/** データ種別に応じたUint8Arrayチャンクを生成する（統合ディスパッチ） */
export function generateChunkByType(sizeBytes: number, dataType: DataType): Uint8Array {
  switch (dataType) {
    case "random":
      return generateChunk(sizeBytes);
    case "bmp":
      return generateBmpChunk(sizeBytes);
    case "text":
      return generateTextChunk(sizeBytes);
    case "json":
      return generateJsonChunk(sizeBytes);
  }
}

/** データ種別に応じた文字列チャンクを生成する（localStorage/sessionStorage用） */
export function generateStringChunkByType(sizeBytes: number, dataType: DataType): string {
  switch (dataType) {
    case "text": {
      const decoder = new TextDecoder();
      return decoder.decode(generateTextChunk(sizeBytes));
    }
    case "json": {
      const decoder = new TextDecoder();
      return decoder.decode(generateJsonChunk(sizeBytes));
    }
    default:
      // random / bmp はBase64エンコード
      return generateStringChunk(sizeBytes);
  }
}
