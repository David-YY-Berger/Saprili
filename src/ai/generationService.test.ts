// bisiyata dishmaya, leharbot ahava biyisral
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import { fixedClock } from '@/shared/clock';
import { createBookRepository } from '@/storage/bookRepository';
import { createImageRepository } from '@/storage/imageRepository';
import { InMemorySettingsRepository } from '@/storage/settingsStore';
import { createTestStorage } from '@/storage/testing';
import type { ImageGenRequest, ImageProvider } from './ImageProvider';
import { createGenerationService, pushIllustrationVersion } from './generationService';
import { MockImageProvider, type MockProviderFault } from './providers/MockImageProvider';

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-02-01T00:00:00.000Z';

describe('generation service', () => {
  let books: ReturnType<typeof createBookRepository>;
  let images: ReturnType<typeof createImageRepository>;
  let settings: InMemorySettingsRepository;
  let calls: ImageGenRequest[];
  let selectedModels: string[];
  let fault: MockProviderFault;
  let service: ReturnType<typeof createGenerationService>;

  beforeEach(async () => {
    const storage = createTestStorage();
    const clock = fixedClock(T1);
    const deps = { storage: () => storage, clock };
    books = createBookRepository(deps);
    images = createImageRepository(deps);
    settings = new InMemorySettingsRepository();
    await settings.saveUserSettings({
      schemaVersion: 2,
      illustrationModelId: 'gemini-3-pro-image',
      colouringModelId: 'gemini-3.1-flash-lite-image',
      apiKey: 'test-key',
    });
    calls = [];
    selectedModels = [];
    fault = null;
    const providerFactory = (modelId: string): ImageProvider => {
      selectedModels.push(modelId);
      const mock = new MockImageProvider(modelId, fault);
      return {
        generateImage: async (request) => {
          calls.push(request);
          return mock.generateImage(request);
        },
        editImage: async (request) => {
          calls.push(request);
          return mock.editImage(request);
        },
      };
    };
    service = createGenerationService({
      providerFactory,
      imageRepository: images,
      bookRepository: books,
      settingsRepository: settings,
      clock,
      createThumbnail: async () => ({ blob: new Blob(['thumb']), widthPx: 1, heightPx: 1 }),
      postprocess: {
        fitToShape: async (blob) => blob,
        detectGreyLevels: async () => true,
        forceBlackWhite: async () => new Blob(['pure black and white'], { type: 'image/png' }),
        measureImage: async () => ({ widthPx: 800, heightPx: 1100 }),
      },
    });
    const book = createEmptyBook({ id: 'book', nowIso: T0 });
    book.storyPages = [createStoryPage({ id: 'page-1', textEn: 'A story.' })];
    await books.createBook(book);
  });

  it('generates and retries illustrations, preserving a maximum of three older versions', async () => {
    let saved = await service.generateIllustrationForPage('book', 'page-1');
    const firstId = saved.imageId;
    expect(saved.book.storyPages[0]!.illustration.currentImageId).toBe(firstId);

    for (let index = 0; index < 4; index += 1) {
      saved = await service.generateIllustrationForPage('book', 'page-1', {
        customPrompt: `Variation ${index}`,
      });
    }

    expect(saved.book.storyPages[0]!.illustration.history).toHaveLength(3);
    expect(saved.book.storyPages[0]!.illustration.history[0]!.imageId).not.toBe(firstId);
    expect(await images.getImage(firstId)).toBeNull();
    expect(selectedModels).toEqual(Array(5).fill('gemini-3-pro-image'));
    expect((await images.getImage(saved.imageId))?.meta).toMatchObject({
      source: 'generated',
      modelId: 'gemini-3-pro-image',
    });
    expect(saved.book.storyPages[0]!.colouring.outdated).toBe(true);
  });

  it('makes colouring from only the current illustration with the cheaper model', async () => {
    const illustration = await service.generateIllustrationForPage('book', 'page-1');
    calls.length = 0;
    const result = await service.generateColouringForPage('book', 'page-1');
    expect(selectedModels).toEqual(['gemini-3-pro-image', 'gemini-3.1-flash-lite-image']);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.referenceImages).toHaveLength(1);
    expect(await calls[0]!.referenceImages[0]!.text()).toContain('<svg');
    expect(result.book.storyPages[0]!.colouring).toEqual({
      imageId: result.imageId,
      sourceIllustrationImageId: illustration.imageId,
      outdated: false,
    });
    expect(await (await images.getImage(result.imageId))!.blob.text()).toBe(
      'pure black and white',
    );
  });

  it('generates and stores a separate cover portrait for each intro character', async () => {
    const book = await books.getBook('book');
    expect(book).not.toBeNull();
    book!.intro.characters = [
      { id: 'child', name: 'Miriam', description: 'Curly hair', photo: null },
      { id: 'parent', name: 'Dad', description: 'Glasses', photo: null },
    ];
    await books.save(book!, 'userEdit');

    const result = await service.generateCoverCharacterPortraits('book');
    expect(calls).toHaveLength(2);
    expect(result.book.cover.artworkMode).toBe('characterPortraits');
    expect(result.book.cover.characterPortraits.map((portrait) => portrait.characterId)).toEqual([
      'child',
      'parent',
    ]);
    expect(result.book.cover.characterPortraits.every((portrait) => portrait.imageId)).toBe(true);
    expect((await images.getImage(result.book.cover.characterPortraits[0]!.imageId))?.kind).toBe(
      'coverIllustration',
    );
  });

  it('generates back-cover art from only its uploaded reference and saves it separately', async () => {
    const reference = new Blob(['original family photo'], { type: 'image/jpeg' });
    await images.putImage({
      id: 'back-reference',
      bookId: 'book',
      kind: 'coverUserImage',
      blob: reference,
      mime: reference.type,
      widthPx: 1200,
      heightPx: 1600,
      byteSize: reference.size,
      createdAt: T0,
      meta: { source: 'uploaded' },
    });
    const book = await books.getBook('book');
    book!.cover.back.referenceImageId = 'back-reference';
    await books.save(book!, 'userEdit');

    const result = await service.generateBackCoverIllustration('book', 'back-reference');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.referenceImages).toEqual([reference]);
    expect(calls[0]!.instructions).toContain('back cover');
    expect(result.book.cover.back).toMatchObject({
      artworkMode: 'generate',
      referenceImageId: 'back-reference',
      generatedImageId: result.imageId,
    });
    expect((await images.getImage(result.imageId))?.meta.source).toBe('generated');
  });

  it('gates colouring without an illustration and makes no provider call', async () => {
    await expect(service.generateColouringForPage('book', 'page-1')).rejects.toMatchObject({
      code: 'AI_BAD_RESPONSE',
    });
    expect(selectedModels).toHaveLength(0);
  });

  it('restores an older version and marks the colouring page outdated', async () => {
    const first = await service.generateIllustrationForPage('book', 'page-1');
    const second = await service.generateIllustrationForPage('book', 'page-1');
    const restored = await service.restoreIllustrationVersion('book', 'page-1', first.imageId);
    expect(restored.storyPages[0]!.illustration.currentImageId).toBe(first.imageId);
    expect(restored.storyPages[0]!.illustration.history[0]!.imageId).toBe(second.imageId);
    expect(restored.storyPages[0]!.colouring.outdated).toBe(true);
  });

  it('surfaces provider refusal without saving a partial image', async () => {
    fault = 'refuse';
    await expect(service.generateIllustrationForPage('book', 'page-1')).rejects.toMatchObject({
      code: 'AI_REFUSED',
    });
    expect(await images.listImageIdsForBook('book')).toEqual([]);
  });

  it('requires a key and does not call a provider when it is missing', async () => {
    await settings.saveUserSettings({
      schemaVersion: 2,
      illustrationModelId: 'gemini-3-pro-image',
      colouringModelId: 'gemini-3.1-flash-lite-image',
      apiKey: null,
    });
    await expect(service.generateIllustrationForPage('book', 'page-1')).rejects.toMatchObject({
      code: 'AI_NO_KEY',
    });
    expect(selectedModels).toHaveLength(0);
  });

  it('keeps only the three most recent previous illustration entries', () => {
    const state = {
      currentImageId: 'current',
      history: [
        { imageId: 'old-1', replacedAt: T0 },
        { imageId: 'old-2', replacedAt: T0 },
        { imageId: 'old-3', replacedAt: T0 },
      ],
      customPrompt: '',
      useEditMode: false,
    };
    expect(pushIllustrationVersion(state, 'new', T1).history.map((entry) => entry.imageId)).toEqual([
      'current',
      'old-1',
      'old-2',
    ]);
  });
});
