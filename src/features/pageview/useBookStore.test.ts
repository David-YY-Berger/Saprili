// bisiyata dishmaya, leharbot ahava biyisral
import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyBook } from '@/domain/factories';
import { bookRepository, setStorageForTests } from '@/storage/repositories';
import { createTestStorage } from '@/storage/testing';
import { useBookStore } from './useBookStore';

afterEach(() => setStorageForTests(null));

describe('merging generated intro artwork', () => {
  it('keeps unsaved intro edits and persists background artwork', async () => {
    setStorageForTests(createTestStorage());
    const book = createEmptyBook({ id: 'merge-intro', nowIso: '2026-01-01T00:00:00.000Z' });
    book.intro.mode = 'regular';
    await bookRepository.createBook(book);
    await useBookStore.getState().loadBook(book.id);
    useBookStore.getState().updateBook((current) => ({
      ...current,
      intro: { ...current.intro, textEn: 'Unsaved text', illustration: { ...current.intro.illustration, customPrompt: 'Prompt' } },
    }));
    const stored = (await bookRepository.getBook(book.id))!;
    stored.intro.illustration.currentImageId = 'generated';
    stored.intro.colouring.imageId = 'colouring';
    await bookRepository.save(stored, 'generation');
    await useBookStore.getState().mergeGenerated(book.id);
    await useBookStore.getState().commit('userEdit');
    expect((await bookRepository.getBook(book.id))!.intro).toMatchObject({
      textEn: 'Unsaved text',
      illustration: { currentImageId: 'generated', customPrompt: 'Prompt' },
      colouring: { imageId: 'colouring' },
    });
  });
});
