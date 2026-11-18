// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import { createEmptyBook } from '@/domain/factories';
import { systemClock } from '@/shared/clock';
import { toAppError } from '@/shared/errors';
import { bookRepository } from '@/storage/repositories';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/ToastHost';

export function NewBookButton() {
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const create = async () => {
    setBusy(true);
    try {
      const books = await bookRepository.listBookSummaries();
      const book = createEmptyBook({ nowIso: systemClock.nowIso(), title: `book${books.length + 1}` });
      await bookRepository.createBook(book);
      window.location.hash = `#/book/${encodeURIComponent(book.id)}/setup`;
    } catch (createError) {
      const appError = toAppError(createError);
      showToast(`${appError.userMessage} ${appError.nextStep}`, 'error');
      setBusy(false);
    }
  };

  return (
    <Button disabled={busy} onClick={() => void create()}>
      New book
    </Button>
  );
}
