// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import type { Book } from '@/domain/book';
import type { PageRef } from '@/domain/page';
import { Button } from '@/ui/Button';
import { PreflightDialog } from '@/print/PreflightDialog';
import { startPrint } from '@/print/printJob';

const actions = [
  ['Generate / Retry', 'Available in Phase 9'],
  ['Make colouring page', 'Available in Phase 9'],
  ['Download page files', 'Available in Phase 11'],
] as const;

export function PageActionsBar({ book, pageRef }: { book: Book; pageRef: PageRef }) {
  const [preflightOpen, setPreflightOpen] = useState(false);
  return (
    <>
      <div aria-label="Page actions" className="page-actions">
        {actions.slice(0, 3).map(([label, phase]) => (
          <Button disabled key={label} title={phase} type="button" variant="secondary">
            {label}
          </Button>
        ))}
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
