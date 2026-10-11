// bisiyata dishmaya, leharbot ahava biyisral
import { create } from 'zustand';
import type { Book } from '@/domain/book';
import { bookRepository } from '@/storage/repositories';
import type { SaveReason } from '@/storage/bookRepository';
import { AppError } from '@/shared/errors';

function sameContent(left: Book, right: Book): boolean {
  return JSON.stringify({ ...left, modifiedAt: '' }) ===
    JSON.stringify({ ...right, modifiedAt: '' });
}

interface BookStoreState {
  book: Book | null;
  loadBook: (id: string) => Promise<Book>;
  updateBook: (mutator: (current: Book) => Book) => void;
  commit: (reason: SaveReason, snapshot?: Book) => Promise<Book>;
  /** Pulls pictures saved by the job host into the open book without touching user edits. */
  mergeGenerated: (bookId: string) => Promise<void>;
}

let persistedBook: Book | null = null;
let pendingSave: Promise<void> = Promise.resolve();
let loadSequence = 0;

function withGenerated(target: Book, stored: Book): Book {
  const storedPages = new Map(stored.storyPages.map((page) => [page.id, page]));
  return {
    ...target,
    modifiedAt: stored.modifiedAt,
    cover: {
      ...target.cover,
      illustration: {
        ...target.cover.illustration,
        currentImageId: stored.cover.illustration.currentImageId,
        history: stored.cover.illustration.history,
      },
    },
    storyPages: target.storyPages.map((page) => {
      const saved = storedPages.get(page.id);
      return saved
        ? {
            ...page,
            illustration: {
              ...page.illustration,
              currentImageId: saved.illustration.currentImageId,
              history: saved.illustration.history,
            },
            colouring: saved.colouring,
          }
        : page;
    }),
  };
}

export const useBookStore = create<BookStoreState>((set, get) => ({
  book: null,

  async mergeGenerated(bookId) {
    await pendingSave.catch(() => undefined);
    const stored = await bookRepository.getBook(bookId);
    const current = get().book;
    if (!stored || !current || current.id !== bookId) return;
    if (persistedBook?.id === bookId) persistedBook = withGenerated(persistedBook, stored);
    set({ book: withGenerated(get().book ?? current, stored) });
  },

  async loadBook(id) {
    const sequence = ++loadSequence;
    set({ book: null });
    const loaded = await bookRepository.getBook(id);
    if (!loaded) throw new AppError('STORAGE_FAILED', { detail: `Book ${id} was not found` });
    if (sequence === loadSequence) {
      persistedBook = loaded;
      set({ book: loaded });
    }
    return loaded;
  },

  updateBook(mutator) {
    const current = get().book;
    if (!current) throw new AppError('STORAGE_FAILED', { detail: 'No book is loaded for editing' });
    const next = mutator(current);
    if (next !== current) set({ book: next });
  },

  commit(reason, snapshot) {
    const queued = pendingSave.catch(() => undefined).then(async () => {
      const target = snapshot ?? get().book;
      if (!target) throw new AppError('STORAGE_FAILED', { detail: 'No book is loaded for saving' });
      if (persistedBook && persistedBook.id === target.id && sameContent(target, persistedBook)) {
        return persistedBook;
      }
      const saved = await bookRepository.save(target, reason);
      persistedBook = saved;
      const current = get().book;
      if (current?.id === target.id) {
        set({
          book:
            current === target
              ? saved
              : { ...current, modifiedAt: saved.modifiedAt },
        });
      }
      return saved;
    });
    pendingSave = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  },
}));
