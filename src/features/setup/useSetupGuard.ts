// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect } from 'react';
import type { Book } from '@/domain/book';

export function useSetupGuard(bookId: string, book: Book | null): void {
  useEffect(() => {
    if (book && book.format.lockedAt === null) {
      window.location.hash = `#/book/${encodeURIComponent(bookId)}/setup`;
    }
  }, [book, bookId]);
}
