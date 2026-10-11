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
}

let persistedBook: Book | null = null;
let pendingSave: Promise<void> = Promise.resolve();
let loadSequence = 0;

export const useBookStore = create<BookStoreState>((set, get) => ({
  book: null,

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
