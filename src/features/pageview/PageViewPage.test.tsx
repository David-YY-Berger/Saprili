// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyBook, createStoryPagePair } from '@/domain/factories';
import { bookRepository, imageRepository, setStorageForTests } from '@/storage/repositories';
import { createTestStorage } from '@/storage/testing';
import { ToastHost } from '@/ui/ToastHost';
import { AppRoutes } from '@/app/routes';

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function illustrationRecord(bookId: string, id: string, kind: 'illustration' | 'colouring') {
  const blob = new Blob(['image'], { type: 'image/png' });
  return {
    id,
    bookId,
    kind,
    blob,
    mime: blob.type,
    widthPx: 64,
    heightPx: 64,
    byteSize: blob.size,
    createdAt: '2026-10-01T00:00:00.000Z',
    meta: { source: 'uploaded' as const },
  };
}

beforeEach(async () => {
  setStorageForTests(createTestStorage());
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn().mockReturnValue('blob:phase4-test'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  window.location.hash = '#/';
  const book = createEmptyBook({ nowIso: '2026-10-01T00:00:00.000Z', id: 'phase4-book' });
  book.format.lockedAt = book.createdAt;
  book.storyPages = createStoryPagePair();
  const originalImageId = 'phase4-original';
  const aiCopyImageId = 'phase4-ai-copy';
  book.storyPages[0]!.photos = [{ originalImageId, aiCopyImageId }];
  await bookRepository.createBook(book);
  const blob = new Blob(['image'], { type: 'image/png' });
  vi.spyOn(imageRepository, 'getThumb').mockResolvedValue({
    imageId: originalImageId,
    bookId: book.id,
    blob,
    widthPx: 64,
    heightPx: 64,
  });
  vi.spyOn(imageRepository, 'getImage').mockResolvedValue({
    id: originalImageId,
    bookId: book.id,
    kind: 'original',
    blob,
    mime: blob.type,
    widthPx: 100,
    heightPx: 100,
    byteSize: blob.size,
    createdAt: book.createdAt,
    meta: { source: 'uploaded' },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setStorageForTests(null);
  if (originalCreateObjectURL) {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: originalCreateObjectURL,
    });
  } else {
    delete (URL as unknown as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  } else {
    delete (URL as unknown as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
  }
});

describe('Phase 4 page editor', () => {
  it('saves English and Hebrew edits and restores them on reload', async () => {
    const book = await bookRepository.getBook('phase4-book');
    const page = book!.storyPages[0]!;
    window.location.hash = `#/book/phase4-book/page/${encodeURIComponent(page.id)}`;
    const view = render(
      <ToastHost>
        <AppRoutes />
      </ToastHost>,
    );

    fireEvent.change(await screen.findByLabelText('English text'), {
      target: { value: 'A paragraph\\nwith a second line.' },
    });
    fireEvent.change(screen.getByLabelText('Hebrew text'), {
      target: { value: 'שלום\\nעולם' },
    });
    await waitFor(async () => {
      const saved = await bookRepository.getBook('phase4-book');
      expect(saved?.storyPages[0]?.textEn).toBe('A paragraph\\nwith a second line.');
      expect(saved?.storyPages[0]?.textHe).toBe('שלום\\nעולם');
    });

    view.unmount();
    render(
      <ToastHost>
        <AppRoutes />
      </ToastHost>,
    );
    expect(((await screen.findByLabelText('English text')) as HTMLTextAreaElement).value).toBe(
      'A paragraph\\nwith a second line.',
    );
    expect((screen.getByLabelText('Hebrew text') as HTMLTextAreaElement).value).toBe('שלום\\nעולם');
  });

  it('opens full-size pictures, closes with Escape, and restores focus', async () => {
    const book = await bookRepository.getBook('phase4-book');
    const page = book!.storyPages[0]!;
    window.location.hash = `#/book/phase4-book/page/${encodeURIComponent(page.id)}`;
    render(
      <ToastHost>
        <AppRoutes />
      </ToastHost>,
    );
    const trigger = await screen.findByRole('button', { name: 'Open picture 1' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Picture 1' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Picture 1' })).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it('removes a picture with an undo action', async () => {
    const book = await bookRepository.getBook('phase4-book');
    const page = book!.storyPages[0]!;
    window.location.hash = `#/book/phase4-book/page/${encodeURIComponent(page.id)}`;
    render(
      <ToastHost>
        <AppRoutes />
      </ToastHost>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Remove picture 1' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(async () => {
      expect((await bookRepository.getBook('phase4-book'))?.storyPages[0]?.photos).toHaveLength(1);
    });
  });

  it('permanently deletes an illustration and its history while preserving its colouring page', async () => {
    const book = await bookRepository.getBook('phase4-book');
    const page = book!.storyPages[0]!;
    const currentImageId = 'phase4-illustration-current';
    const historyImageId = 'phase4-illustration-history';
    const colouringImageId = 'phase4-colouring';
    page.illustration.currentImageId = currentImageId;
    page.illustration.history = [{ imageId: historyImageId, replacedAt: book!.createdAt }];
    page.colouring = {
      imageId: colouringImageId,
      sourceIllustrationImageId: currentImageId,
      outdated: false,
    };
    await bookRepository.save(book!, 'userEdit');
    await Promise.all([
      imageRepository.putImage(illustrationRecord(book!.id, currentImageId, 'illustration')),
      imageRepository.putImage(illustrationRecord(book!.id, historyImageId, 'illustration')),
      imageRepository.putImage(illustrationRecord(book!.id, colouringImageId, 'colouring')),
    ]);
    window.location.hash = `#/book/phase4-book/page/${encodeURIComponent(page.id)}`;
    render(
      <ToastHost>
        <AppRoutes />
      </ToastHost>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Delete illustration' }));

    await waitFor(async () => {
      const saved = await bookRepository.getBook('phase4-book');
      expect(saved?.storyPages[0]?.illustration.currentImageId).toBeNull();
      expect(saved?.storyPages[0]?.illustration.history).toEqual([]);
      expect(saved?.storyPages[0]?.colouring).toEqual({
        imageId: colouringImageId,
        sourceIllustrationImageId: null,
        outdated: true,
      });
      expect(await imageRepository.listImageIdsForBook('phase4-book')).toEqual([colouringImageId]);
    });
  });

  it('does not accept images dropped into the illustration area', async () => {
    const book = await bookRepository.getBook('phase4-book');
    const page = book!.storyPages[0]!;
    const currentImageId = 'phase4-illustration-current';
    page.illustration.currentImageId = currentImageId;
    await bookRepository.save(book!, 'userEdit');
    await imageRepository.putImage(illustrationRecord(book!.id, currentImageId, 'illustration'));
    window.location.hash = `#/book/phase4-book/page/${encodeURIComponent(page.id)}`;
    render(
      <ToastHost>
        <AppRoutes />
      </ToastHost>,
    );

    const section = await screen.findByRole('region', { name: 'Illustration' });
    const dataTransfer = {
      files: [new File(['dropped'], 'dropped.png', { type: 'image/png' })],
    };
    fireEvent.dragOver(section, { dataTransfer });
    fireEvent.drop(section, { dataTransfer });

    expect(
      (await bookRepository.getBook('phase4-book'))?.storyPages[0]?.illustration.currentImageId,
    ).toBe(currentImageId);
    expect(await imageRepository.listImageIdsForBook('phase4-book')).toEqual([currentImageId]);
  });
});
