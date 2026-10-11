// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useEffect, useState } from 'react';
import type { BookSummary } from '@/domain/book';
import { bookRepository } from '@/storage/repositories';

export function useBookSummaries() {
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summaries = await bookRepository.listBookSummaries();
      summaries.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
      setBooks(summaries);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { books, setBooks, loading, error, refresh };
}
