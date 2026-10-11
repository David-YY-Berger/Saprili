// bisiyata dishmaya, leharbot ahava biyisral
import { AppError } from '@/shared/errors';

export interface ImageDimensions {
  widthPx: number;
  heightPx: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeCropRect(width: number, height: number, aspect: number): CropRect {
  if (
    !Number.isFinite(aspect) ||
    aspect <= 0 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new AppError('AI_BAD_RESPONSE', { detail: 'Image dimensions and aspect must be positive' });
  }
  if (width / height > aspect) {
    const cropWidth = Math.max(1, Math.round(height * aspect));
    return { x: Math.floor((width - cropWidth) / 2), y: 0, width: cropWidth, height };
  }
  const cropHeight = Math.max(1, Math.round(width / aspect));
  return { x: 0, y: Math.floor((height - cropHeight) / 2), width, height: cropHeight };
}

export function hasNonBlackWhitePixel(data: Uint8ClampedArray): boolean {
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index]!;
    const green = data[index + 1]!;
    const blue = data[index + 2]!;
    if (Math.min(red, green, blue) > 12 && Math.max(red, green, blue) < 243) return true;
    if (Math.max(red, green, blue) - Math.min(red, green, blue) > 16) return true;
  }
  return false;
}

export function thresholdToBlackWhite(data: Uint8ClampedArray, threshold = 190): void {
  for (let index = 0; index < data.length; index += 4) {
    const luminance =
      0.2126 * data[index]! + 0.7152 * data[index + 1]! + 0.0722 * data[index + 2]!;
    const value = luminance >= threshold ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
}

async function openImage(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch (cause) {
    throw new AppError('IMAGE_DECODE_FAILED', { cause });
  }
}

function openCanvas(width: number, height: number): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  if (!canvas.getContext('2d')) throw new AppError('IMAGE_DECODE_FAILED');
  return canvas;
}

export async function measureImage(blob: Blob): Promise<ImageDimensions> {
  const image = await openImage(blob);
  try {
    return { widthPx: image.width, heightPx: image.height };
  } finally {
    image.close();
  }
}

export async function fitToShape(blob: Blob, aspect: number): Promise<Blob> {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new AppError('AI_BAD_RESPONSE', { detail: 'Target image aspect must be positive' });
  }
  const image = await openImage(blob);
  try {
    const crop = computeCropRect(image.width, image.height, aspect);
    if (crop.width === image.width && crop.height === image.height) return blob;
    const canvas = openCanvas(crop.width, crop.height);
    const context = canvas.getContext('2d');
    if (!context) throw new AppError('IMAGE_DECODE_FAILED');
    context.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );
    return await canvas.convertToBlob({ type: blob.type || 'image/png' });
  } finally {
    image.close();
  }
}

export async function detectGreyLevels(blob: Blob): Promise<boolean> {
  const image = await openImage(blob);
  try {
    const canvas = openCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    if (!context) throw new AppError('IMAGE_DECODE_FAILED');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, image.width, image.height);
    context.drawImage(image, 0, 0);
    return hasNonBlackWhitePixel(context.getImageData(0, 0, image.width, image.height).data);
  } finally {
    image.close();
  }
}

export async function forceBlackWhite(blob: Blob, threshold = 190): Promise<Blob> {
  const image = await openImage(blob);
  try {
    const canvas = openCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    if (!context) throw new AppError('IMAGE_DECODE_FAILED');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, image.width, image.height);
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height);
    thresholdToBlackWhite(pixels.data, threshold);
    context.putImageData(pixels, 0, 0);
    return await canvas.convertToBlob({ type: 'image/png' });
  } finally {
    image.close();
  }
}
