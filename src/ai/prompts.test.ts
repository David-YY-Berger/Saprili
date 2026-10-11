// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import type { ImageRecord } from '@/domain/image';
import {
  buildColouringRequest,
  buildCoverIllustrationRequest,
  buildIllustrationRequest,
} from './prompts';

const T0 = '2026-01-01T00:00:00.000Z';

function imageRecord(id: string): ImageRecord {
  const blob = new Blob([id], { type: 'image/png' });
  return {
    id,
    bookId: 'book',
    kind: 'aiCopy',
    blob,
    mime: 'image/png',
    widthPx: 12,
    heightPx: 12,
    byteSize: blob.size,
    createdAt: T0,
    meta: { source: 'uploaded' },
  };
}

function fixture() {
  const book = createEmptyBook({ id: 'book', nowIso: T0 });
  book.intro.textEn = 'The family lives near the sea.';
  book.intro.textHe = 'המשפחה גרה ליד הים';
  book.intro.photos = [
    { originalImageId: 'intro-original-1', aiCopyImageId: 'intro-ai-1' },
    { originalImageId: 'intro-original-2', aiCopyImageId: 'intro-ai-2' },
    { originalImageId: 'intro-original-3', aiCopyImageId: 'intro-ai-3' },
    { originalImageId: 'intro-original-4', aiCopyImageId: 'intro-ai-4' },
  ];
  const first = createStoryPage({
    id: 'story-1',
    textEn: 'Miriam finds a shell.',
    textHe: 'מרים מוצאת צדף',
    privateTitle: 'PRIVATE PAGE TITLE',
  });
  first.photos = [
    { originalImageId: 'story-original-1', aiCopyImageId: 'story-ai-1' },
    { originalImageId: 'story-original-2', aiCopyImageId: 'story-ai-2' },
    { originalImageId: 'story-original-3', aiCopyImageId: 'story-ai-3' },
    { originalImageId: 'story-original-4', aiCopyImageId: 'story-ai-4' },
  ];
  const second = createStoryPage({ id: 'story-2', textEn: 'OTHER PAGE SECRET' });
  second.photos = [{ originalImageId: 'other-original', aiCopyImageId: 'other-ai' }];
  book.storyPages = [first, second];

  const records = new Map<string, ImageRecord>();
  for (const id of [
    'intro-ai-1',
    'intro-ai-2',
    'intro-ai-3',
    'intro-ai-4',
    'story-ai-1',
    'story-ai-2',
    'story-ai-3',
    'story-ai-4',
    'other-ai',
  ]) {
    records.set(id, imageRecord(id));
  }
  const illustration = imageRecord('illustration-only');
  illustration.kind = 'illustration';
  records.set(illustration.id, illustration);
  book.storyPages[0]!.illustration.currentImageId = illustration.id;
  const imageRepository = {
    getImage: async (id: string) => records.get(id) ?? null,
  };
  return { book, imageRepository };
}

describe('AI prompt payload composition', () => {
  it('sends only English intro/page context and capped AI-copy photos', async () => {
    const { book, imageRepository } = fixture();
    const request = await buildIllustrationRequest(
      book,
      'story-1',
      { customPrompt: 'Keep it sunny עברית', artStyleText: 'Soft watercolour' },
      imageRepository,
    );
    expect(request.instructions).toContain('The family lives near the sea.');
    expect(request.instructions).toContain('Miriam finds a shell.');
    expect(request.instructions).toContain('Soft watercolour');
    expect(request.instructions).toContain('Keep it sunny');
    expect(request.instructions).not.toMatch(/[\u0590-\u05ff]/);
    expect(request.instructions).not.toContain('PRIVATE PAGE TITLE');
    expect(request.instructions).not.toContain('OTHER PAGE SECRET');
    expect(request.referenceImages.map((image) => image.size)).toEqual([10, 10, 10, 10, 10, 10]);
    expect(request.omittedPhotoCount).toBe(2);
  });

  it('sends only the target illustration for colouring', async () => {
    const { book, imageRepository } = fixture();
    const request = await buildColouringRequest(book, 'story-1', imageRepository);
    expect(request.referenceImages).toHaveLength(1);
    expect(await request.referenceImages[0]!.text()).toBe('illustration-only');
    expect(request.instructions).toContain('4-year-old');
    expect(request.instructions).not.toMatch(/[\u0590-\u05ff]/);
    expect(request.instructions).not.toContain('Miriam finds a shell.');
  });

  it('uses only intro context and photos for the cover', async () => {
    const { book, imageRepository } = fixture();
    const request = await buildCoverIllustrationRequest(book, imageRepository);
    expect(request.instructions).toContain('The family lives near the sea.');
    expect(request.instructions).not.toContain('Miriam finds a shell.');
    expect(request.instructions).not.toContain('OTHER PAGE SECRET');
    expect(request.referenceImages).toHaveLength(3);
    expect(request.omittedPhotoCount).toBe(1);
  });

  it('uses character pictures and descriptions in order instead of intro photos', async () => {
    const { book, imageRepository } = fixture();
    const records = new Map<string, ImageRecord>();
    for (const id of ['char-ai-1', 'char-ai-2', 'story-ai-1']) records.set(id, imageRecord(id));
    book.intro.characters = [
      {
        id: 'c1',
        name: 'Miriam עברית',
        description: 'Five years old, curly hair',
        photo: { originalImageId: 'char-o-1', aiCopyImageId: 'char-ai-1' },
      },
      { id: 'c2', name: 'Dad', description: 'Tall, glasses', photo: null },
      {
        id: 'c3',
        name: 'Shira',
        description: 'Baby',
        photo: { originalImageId: 'char-o-2', aiCopyImageId: 'char-ai-2' },
      },
    ];
    book.storyPages[0]!.photos = [{ originalImageId: 'story-o-1', aiCopyImageId: 'story-ai-1' }];
    const request = await buildIllustrationRequest(
      book,
      'story-1',
      {},
      { getImage: async (id: string) => records.get(id) ?? null },
    );
    expect(request.instructions).toContain('- Miriam (reference picture 1): Five years old, curly hair');
    expect(request.instructions).toContain('- Dad (no picture): Tall, glasses');
    expect(request.instructions).toContain('- Shira (reference picture 2): Baby');
    expect(request.instructions).not.toMatch(/[\u0590-\u05ff]/);
    expect(await Promise.all(request.referenceImages.map((b) => b.text()))).toEqual([
      'char-ai-1',
      'char-ai-2',
      'story-ai-1',
    ]);
    expect(request.omittedPhotoCount).toBe(0);
    expect(imageRepository).toBeDefined();
  });

  it('fails rather than silently generating colouring art without an illustration', async () => {
    const { book, imageRepository } = fixture();
    book.storyPages[0]!.illustration.currentImageId = null;
    await expect(buildColouringRequest(book, 'story-1', imageRepository)).rejects.toMatchObject({
      code: 'AI_BAD_RESPONSE',
    });
  });
});
