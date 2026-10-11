// bisiyata dishmaya, leharbot ahava biyisral
import { AppError } from '@/shared/errors';
import { AI_COPY_LONG_EDGE_PX, ORIGINAL_LONG_EDGE_PX } from '@/domain/constants';

export interface ResizedImage {
  blob: Blob;
  mime: string;
  widthPx: number;
  heightPx: number;
}

export function getResizedDimensions(
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

export async function resizeToLongEdge(
  bitmap: ImageBitmap,
  longEdgePx: number,
  mime: string,
  quality: number,
): Promise<ResizedImage> {
  const { widthPx, heightPx } = getResizedDimensions(bitmap.width, bitmap.height, longEdgePx);
  const canvas = new OffscreenCanvas(widthPx, heightPx);
  const context = canvas.getContext('2d');
  if (!context) throw new AppError('IMAGE_DECODE_FAILED');
  context.drawImage(bitmap, 0, 0, widthPx, heightPx);
  const blob = await canvas.convertToBlob({ type: mime, quality });
  return { blob, mime: blob.type, widthPx, heightPx };
}

/** Decoding through createImageBitmap applies EXIF orientation without using DOM Image. */
export async function decodeImageFile(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith('image/')) throw new AppError('IMAGE_DECODE_FAILED');
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (cause) {
    throw new AppError('IMAGE_DECODE_FAILED', { cause });
  }
}

export async function makeOriginal(
  bitmap: ImageBitmap,
  sourceMime: string,
  longEdgePx: number = ORIGINAL_LONG_EDGE_PX,
): Promise<ResizedImage> {
  const mime = sourceMime === 'image/png' ? 'image/png' : 'image/jpeg';
  return resizeToLongEdge(bitmap, longEdgePx, mime, 0.92);
}

export function makeAiCopy(
  bitmap: ImageBitmap,
  longEdgePx: number = AI_COPY_LONG_EDGE_PX,
): Promise<ResizedImage> {
  return resizeToLongEdge(bitmap, longEdgePx, 'image/jpeg', 0.82);
}
