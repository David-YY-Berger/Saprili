// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { useAutosave } from '@/shared/useAutosave';
import type { SaveReason } from '@/storage/bookRepository';

export function useBookAutosave(
  book: Book,
  commit: (reason: SaveReason, snapshot?: Book) => Promise<Book>,
  enabled = true,
) {
  return useAutosave(
    book,
    async (snapshot) => {
      await commit('userEdit', snapshot);
    },
    { enabled },
  );
}
