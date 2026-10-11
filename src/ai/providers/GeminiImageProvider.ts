// bisiyata dishmaya, leharbot ahava biyisral
import { AppError } from '@/shared/errors';
import { mapProviderError } from '@/ai/errors';
import type { ImageGenRequest, ImageGenResult, ImageProvider } from '@/ai/ImageProvider';
import { measureImage, type ImageDimensions } from '@/ai/postprocess';

const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiPart {
  inlineData?: { mimeType?: string; data?: string };
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

interface GeminiErrorResponse {
  error?: { code?: number; message?: string; status?: string };
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += step) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + step));
  }
  return btoa(binary);
}

function closestAspectRatio(aspect: number): string {
  const ratios = [
    ['1:1', 1],
    ['2:3', 2 / 3],
    ['3:2', 3 / 2],
    ['3:4', 3 / 4],
    ['4:3', 4 / 3],
    ['4:5', 4 / 5],
    ['5:4', 5 / 4],
    ['9:16', 9 / 16],
    ['16:9', 16 / 9],
    ['21:9', 21 / 9],
  ] as const;
  return ratios.reduce((best, current) =>
    Math.abs(current[1] - aspect) < Math.abs(best[1] - aspect) ? current : best,
  )[0];
}

export class GeminiImageProvider implements ImageProvider {
  constructor(
    private readonly modelId: string,
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init),
    private readonly imageDimensions: (image: Blob) => Promise<ImageDimensions> = measureImage,
  ) {}

  generateImage(request: ImageGenRequest): Promise<ImageGenResult> {
    return this.requestImage(request);
  }

  editImage(request: ImageGenRequest): Promise<ImageGenResult> {
    return this.requestImage(request);
  }

  private async requestImage(request: ImageGenRequest): Promise<ImageGenResult> {
    if (!this.apiKey.trim()) throw new AppError('AI_NO_KEY');

    const parts: Array<Record<string, unknown>> = [{ text: request.instructions }];
    for (const image of request.referenceImages) {
      parts.push({
        inlineData: {
          mimeType: image.type || 'image/png',
          data: encodeBase64(new Uint8Array(await image.arrayBuffer())),
        },
      });
    }

    let response: Response;
    try {
      response = await this.fetcher(
        `${API_ENDPOINT}/${encodeURIComponent(this.modelId)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              imageConfig: {
                aspectRatio: closestAspectRatio(request.targetAspect),
                imageSize: '1K',
              },
            },
          }),
        },
      );
    } catch (cause) {
      throw new AppError('AI_TEMPORARY', { cause });
    }

    if (!response.ok) {
      let errorPayload: GeminiErrorResponse;
      try {
        errorPayload = (await response.json()) as GeminiErrorResponse;
      } catch {
        throw mapProviderError(response.status, null);
      }
      throw mapProviderError(response.status, errorPayload);
    }

    let payload: GeminiResponse;
    try {
      payload = (await response.json()) as GeminiResponse;
    } catch (cause) {
      throw new AppError('AI_BAD_RESPONSE', { cause });
    }
    const imagePart = payload.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      if (
        payload.candidates?.[0]?.finishReason?.toLowerCase().includes('safety') ||
        payload.promptFeedback?.blockReason
      ) {
        throw new AppError('AI_REFUSED');
      }
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join(' ');
      if (text?.toLowerCase().includes('safety') || text?.toLowerCase().includes('cannot')) {
        throw new AppError('AI_REFUSED');
      }
      throw new AppError('AI_BAD_RESPONSE');
    }

    const decoded = atob(imagePart.inlineData.data);
    const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    const image = new Blob([bytes], { type: imagePart.inlineData.mimeType ?? 'image/png' });
    let dimensions: ImageDimensions;
    try {
      dimensions = await this.imageDimensions(image);
    } catch (cause) {
      throw new AppError('AI_BAD_RESPONSE', { cause });
    }
    return {
      image,
      widthPx: dimensions.widthPx,
      heightPx: dimensions.heightPx,
      modelId: this.modelId,
      usage: {
        inputTokens: payload.usageMetadata?.promptTokenCount,
        outputTokens: payload.usageMetadata?.candidatesTokenCount,
      },
    };
  }
}
