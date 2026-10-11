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
    const provider = new GeminiImageProvider(
      'gemini-3-pro-image',
      'private-key',
      fetcher,
      async () => ({
        widthPx: 700,
        heightPx: 1000,
      }),
    );
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

  it('starts each retry with only that request’s prompt and reference images', async () => {
    const generatedImage = btoa('generated-image');
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { mimeType: 'image/png', data: generatedImage } }],
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const provider = new GeminiImageProvider(
      'gemini-3-pro-image',
      'private-key',
      fetcher,
      async () => ({ widthPx: 700, heightPx: 1000 }),
    );
    const retryRequest = {
      ...request,
      instructions: 'Retry with a brighter background.',
      referenceImages: [new Blob(['retry reference'], { type: 'image/png' })],
    };

    await provider.generateImage(request);
    await provider.generateImage(retryRequest);

    const firstPayload = JSON.parse(fetcher.mock.calls[0]![1]?.body as string);
    const retryPayload = JSON.parse(fetcher.mock.calls[1]![1]?.body as string);
    expect(firstPayload.contents).toHaveLength(1);
    expect(firstPayload.contents[0].parts[0].text).toBe(request.instructions);
    expect(retryPayload.contents).toHaveLength(1);
    expect(retryPayload.contents[0].parts).toEqual([
      { text: retryRequest.instructions },
      {
        inlineData: {
          mimeType: 'image/png',
          data: btoa('retry reference'),
        },
      },
    ]);
    expect(JSON.stringify(retryPayload)).not.toContain(request.instructions);
    expect(JSON.stringify(retryPayload)).not.toContain(generatedImage);
  });

  it('maps authentication and refusal errors to explained app errors', async () => {
    const auth = new GeminiImageProvider(
      'gemini-3-pro-image',
      'secret',
      async () =>
        new Response(JSON.stringify({ error: { status: 'UNAUTHENTICATED' } }), { status: 401 }),
    );
    const refusal = new GeminiImageProvider(
      'gemini-3-pro-image',
      'secret',
      async () =>
        new Response(JSON.stringify({ error: { message: 'Request blocked by safety policy' } }), {
          status: 400,
        }),
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
