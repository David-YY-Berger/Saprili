// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useRef, useState } from 'react';
import type { Book } from '@/domain/book';
import type { PageRef } from '@/domain/page';
import { toAppError } from '@/shared/errors';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/ToastHost';
import { PreflightDialog } from '@/print/PreflightDialog';
import { startPrint } from '@/print/printJob';
import { downloadPageFiles } from '@/features/backup/downloadPageFiles';

export function PageActionsBar({ book, pageRef }: { book: Book; pageRef: PageRef }) {
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const { showToast } = useToast();
  useEffect(
    () => () => controller.current?.abort(),
    [],
  );
  const download = async () => {
    const active = new AbortController();
    controller.current = active;
    setDownloading(true);
    try {
      await downloadPageFiles(book.id, pageRef.id, undefined, active.signal);
      if (!active.signal.aborted) showToast('Page files downloaded.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const appError = toAppError(error);
      showToast(`${appError.userMessage} ${appError.nextStep}`, 'error');
    } finally {
      if (controller.current === active) controller.current = null;
      setDownloading(false);
    }
  };
  return (
    <>
      <div aria-label="Page actions" className="page-actions">
        <Button disabled={downloading} onClick={() => void download()} type="button" variant="secondary">
          {downloading ? 'Preparing page files…' : 'Download page files'}
        </Button>
        {downloading && (
          <Button onClick={() => controller.current?.abort()} type="button" variant="secondary">
            Cancel
          </Button>
        )}
        <Button onClick={() => setPreflightOpen(true)} type="button" variant="secondary">
          Print page
        </Button>
      </div>
      <PreflightDialog
        book={book}
        edition="colour"
        onConfirm={() => startPrint(book.id, 'page', pageRef.id)}
        onClose={() => setPreflightOpen(false)}
        output="page"
        pageId={pageRef.id}
        open={preflightOpen}
      />
    </>
  );
}
