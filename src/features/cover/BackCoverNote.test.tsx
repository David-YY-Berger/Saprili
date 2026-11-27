// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyBook } from '@/domain/factories';
import type { Book } from '@/domain/book';
import { bookRepository, imageRepository, setStorageForTests } from '@/storage/repositories';
import { createTestStorage } from '@/storage/testing';
import { CoverEditorPage } from './CoverEditorPage';

const generation = vi.hoisted(() => ({
  run: vi.fn(),
  complete: undefined as ((book: Book) => void) | undefined,
}));
vi.mock('@/features/pageview/useGenerationRun', () => ({
  useGenerationRun: (_id: string, _before: () => Promise<unknown>, complete: (book: Book) => void) => {
    generation.complete = complete;
    return {
      run: generation.run,
      running: false,
      settingsLoaded: true,
      error: null,
      omittedPhotoCount: 0,
    };
  },
}));
vi.mock('./CoverFlatPreview', () => ({ CoverFlatPreview: () => null }));
vi.mock('./CoverIllustrationControl', () => ({ CoverIllustrationControl: () => null }));
vi.mock('@/storage/thumbnails', () => ({
  createThumbnail: async () => ({ blob: new Blob(['thumb']), widthPx: 1, heightPx: 1 }),
}));

beforeEach(() => {
  setStorageForTests(createTestStorage());
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('File', NodeFile);
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 10, height: 20, close: vi.fn() })));
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:reference'),
    revokeObjectURL: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  setStorageForTests(null);
  vi.unstubAllGlobals();
  generation.run.mockReset();
  generation.complete = undefined;
});

describe('BackCoverNote', () => {
  it('saves the prompt and multiple photos, displays them after reopening, and sends them to generation', async () => {
    const book = createEmptyBook({ id: 'book', nowIso: '2026-01-01T00:00:00.000Z' });
    await bookRepository.createBook(book);
    const editor = render(<CoverEditorPage initialBook={book} />);
    fireEvent.change(screen.getByLabelText('Optional back-cover image instruction'), {
      target: { value: 'A sunny garden' },
    });
    const input = screen.getByLabelText(/Original photos for AI reference/) as HTMLInputElement;
    expect(input.multiple).toBe(true);
    fireEvent.change(input, {
      target: { files: [
        new File(['first'], 'first.jpg', { type: 'image/jpeg' }),
        new File(['second'], 'second.jpg', { type: 'image/jpeg' }),
      ] },
    });
    await screen.findByAltText('Original reference photo 1');
    await screen.findByAltText('Original reference photo 2');
    await waitFor(async () => {
      const saved = await bookRepository.getBook(book.id);
      expect(saved?.cover.back.customPrompt).toBe('A sunny garden');
      expect(saved?.cover.back.referenceImageIds).toHaveLength(2);
    });
    const saved = (await bookRepository.getBook(book.id))!;
    editor.unmount();
    render(<CoverEditorPage initialBook={saved} />);
    expect((screen.getByLabelText('Optional back-cover image instruction') as HTMLTextAreaElement).value)
      .toBe('A sunny garden');
    await screen.findByAltText('Original reference photo 1');
    await screen.findByAltText('Original reference photo 2');
    fireEvent.click(screen.getByRole('button', { name: 'Generate back-cover artwork' }));
    expect(generation.run).toHaveBeenCalledWith('backCover', undefined, {
      referenceImageIds: saved.cover.back.referenceImageIds,
      customPrompt: 'A sunny garden',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove reference photo 1' }));
    const pendingPhoto = new Blob(['pending'], { type: 'image/jpeg' });
    await imageRepository.putImage({
      id: 'pending-upload',
      bookId: book.id,
      kind: 'coverUserImage',
      blob: pendingPhoto,
      mime: pendingPhoto.type,
      widthPx: 10,
      heightPx: 20,
      byteSize: pendingPhoto.size,
      createdAt: book.createdAt,
      meta: { source: 'uploaded' },
    });
    await waitFor(async () => {
      expect((await bookRepository.getBook(book.id))?.cover.back.referenceImageIds)
        .toEqual([saved.cover.back.referenceImageIds[1]]);
      expect(await imageRepository.getImage(saved.cover.back.referenceImageIds[0]!)).toBeNull();
    });
    expect(await imageRepository.getImage(saved.cover.back.referenceImageIds[1]!)).not.toBeNull();
    expect(await imageRepository.getImage('pending-upload')).not.toBeNull();
  });

  it('preserves a newer prompt when generation completes with an older book snapshot', async () => {
    const book = createEmptyBook({ id: 'book', nowIso: '2026-01-01T00:00:00.000Z' });
    await bookRepository.createBook(book);
    render(<CoverEditorPage initialBook={book} />);
    fireEvent.change(screen.getByLabelText('Optional back-cover image instruction'), {
      target: { value: 'Keep this instruction' },
    });
    const generated = structuredClone(book);
    generated.cover.back.generatedImageId = 'result';
    act(() => generation.complete?.(generated));
    expect((screen.getByLabelText('Optional back-cover image instruction') as HTMLTextAreaElement).value)
      .toBe('Keep this instruction');
    await waitFor(async () => {
      expect((await bookRepository.getBook(book.id))?.cover.back).toMatchObject({
        customPrompt: 'Keep this instruction',
        generatedImageId: 'result',
      });
    });
  });
});
