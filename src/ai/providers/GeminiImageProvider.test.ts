// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/shared/errors';
import { GeminiImageProvider } from './GeminiImageProvider';

const request = {
  instructions: 'Draw a friendly family.',
  referenceImages: [new Blob(['reference'], { type: 'image/png' })],
  targetAspect: 0.7,
  sizeHint: '1024px long edge',
  qualityTier: 'medium' as const,
};

describe('GeminiImageProvider', () => {
  it('sends the key in a header and extracts the generated image', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ inlineData: { mimeType: 'image/png', data: btoa('generated-image') } }],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 42, candidatesTokenCount: 7 },
        }),
        { status: 200 },
      ),
    );
    const provider = new GeminiImageProvider('gemini-3-pro-image', 'private-key', fetcher, async () => ({
      widthPx: 700,
      heightPx: 1000,
    }));
    const result = await provider.generateImage(request);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent',
    );
    expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe('private-key');
    expect(url).not.toContain('private-key');
    expect(init?.body).not.toContain('private-key');
    expect(result.image.type).toBe('image/png');
    expect(await result.image.text()).toBe('generated-image');
    expect(result.widthPx).toBe(700);
    expect(result.usage?.inputTokens).toBe(42);
    expect(JSON.parse(init!.body as string).generationConfig.imageConfig.imageSize).toBe('1K');
  });

  it('maps authentication and refusal errors to explained app errors', async () => {
    const auth = new GeminiImageProvider(
      'gemini-3-pro-image',
      'secret',
      async () => new Response(JSON.stringify({ error: { status: 'UNAUTHENTICATED' } }), { status: 401 }),
    );
    const refusal = new GeminiImageProvider(
      'gemini-3-pro-image',
      'secret',
      async () =>
        new Response(
          JSON.stringify({ error: { message: 'Request blocked by safety policy' } }),
          { status: 400 },
        ),
    );
    await expect(auth.generateImage(request)).rejects.toMatchObject({ code: 'AI_AUTH' });
    await expect(refusal.generateImage(request)).rejects.toMatchObject({ code: 'AI_REFUSED' });
  });

  it('does not call Gemini when the key is empty', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const provider = new GeminiImageProvider('gemini-3-pro-image', '  ', fetcher);
    await expect(provider.generateImage(request)).rejects.toBeInstanceOf(AppError);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
