// bisiyata dishmaya, leharbot ahava biyisral
import type { ThumbPayload } from '@/domain/image';
import { THUMB_LONG_EDGE_PX } from '@/domain/constants';

/** Scales so the long edge equals `longEdgePx`; never upscales. */
export function fitLongEdge(
  widthPx: number,
  heightPx: number,
  longEdgePx: number,
): { widthPx: number; heightPx: number } {
  const longEdge = Math.max(widthPx, heightPx);
  if (longEdge <= longEdgePx) return { widthPx, heightPx };
  const scale = longEdgePx / longEdge;
  return {
    widthPx: Math.max(1, Math.round(widthPx * scale)),
    heightPx: Math.max(1, Math.round(heightPx * scale)),
  };
}

// Worker-safe: no DOM Image, so the service worker can call it too.
export async function createThumbnail(
  blob: Blob,
  longEdgePx: number = THUMB_LONG_EDGE_PX,
): Promise<ThumbPayload> {
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  try {
    const { widthPx, heightPx } = fitLongEdge(bitmap.width, bitmap.height, longEdgePx);
    const canvas = new OffscreenCanvas(widthPx, heightPx);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is not available');
    context.drawImage(bitmap, 0, 0, widthPx, heightPx);
    const out = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
    return { blob: out, widthPx, heightPx };
  } finally {
    bitmap.close();
  }
}
