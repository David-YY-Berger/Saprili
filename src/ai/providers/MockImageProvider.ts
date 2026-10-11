// bisiyata dishmaya, leharbot ahava biyisral
import { AppError } from '@/shared/errors';
import type { ImageGenRequest, ImageGenResult, ImageProvider } from '@/ai/ImageProvider';

export type MockProviderFault = 'refuse' | 'rateLimit' | 'timeout' | 'badResponse' | null;

export class MockImageProvider implements ImageProvider {
  constructor(
    private readonly modelId = 'mock-image-model',
    private readonly fault: MockProviderFault = null,
    private readonly delayMs = 0,
  ) {}

  generateImage(request: ImageGenRequest): Promise<ImageGenResult> {
    return this.createImage(request);
  }

  editImage(request: ImageGenRequest): Promise<ImageGenResult> {
    return this.createImage(request);
  }

  private async createImage(request: ImageGenRequest): Promise<ImageGenResult> {
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (this.fault === 'refuse') throw new AppError('AI_REFUSED');
    if (this.fault === 'rateLimit') throw new AppError('AI_QUOTA');
    if (this.fault === 'timeout') throw new AppError('AI_TEMPORARY');
    if (this.fault === 'badResponse') throw new AppError('AI_BAD_RESPONSE');

    const widthPx = Math.max(1, Math.round(1024 * Math.sqrt(request.targetAspect)));
    const heightPx = Math.max(1, Math.round(1024 / Math.sqrt(request.targetAspect)));
    // Browsers (including the service worker) cannot decode SVG blobs off the DOM, so draw a PNG.
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(widthPx, heightPx);
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#fff0c2';
        context.fillRect(0, 0, widthPx, heightPx);
        context.fillStyle = '#ff8e75';
        context.beginPath();
        context.arc(widthPx / 2, heightPx / 2, Math.min(widthPx, heightPx) / 5, 0, Math.PI * 2);
        context.fill();
        return {
          image: await canvas.convertToBlob({ type: 'image/png' }),
          widthPx,
          heightPx,
          modelId: this.modelId,
        };
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}"><rect width="100%" height="100%" fill="#fff0c2"/><circle cx="${widthPx / 2}" cy="${heightPx / 2}" r="${Math.min(widthPx, heightPx) / 5}" fill="#ff8e75"/><text x="50%" y="82%" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#263342">Test image</text></svg>`;
    return {
      image: new Blob([svg], { type: 'image/svg+xml' }),
      widthPx,
      heightPx,
      modelId: this.modelId,
    };
  }
}
