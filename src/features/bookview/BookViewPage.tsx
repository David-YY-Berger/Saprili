// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Book } from '@/domain/book';
import { buildSpreads } from '@/domain/spreads';
import { addStoryPagePairs, deleteStoryPagePair, moveStoryPage } from '@/domain/ordering';
import { bookRepository, imageRepository } from '@/storage/repositories';
import { toAppError, type AppError } from '@/shared/errors';
import { Banner } from '@/ui/Banner';
import { undoManager } from '@/ui/UndoManager';
import { AddPagesDialog } from './AddPagesDialog';
import { BookToolbar } from './BookToolbar';
import { ColophonRow } from './ColophonRow';
import { CoverRow } from './CoverRow';
import { DeletePagesDialog } from './DeletePagesDialog';
import { IntroRow } from './IntroRow';
import { PairGroup } from './PairGroup';
import { useStoryReorder } from './useStoryReorder';
import { PreflightDialog } from '@/print/PreflightDialog';
import { startPrint, type PrintOutput } from '@/print/printJob';
import { GenerateDialog } from '@/features/generate/GenerateDialog';
import { GenerateStatusChip } from '@/features/generate/GenerateStatusChip';
import { useBookJobs } from '@/features/generate/useBookJobs';
import { BackupButton } from '@/features/backup/BackupButton';

export function BookViewPage({ book: initialBook }: { book: Book }) {
  const [book, setBook] = useState(initialBook);
  const [generateOpen, setGenerateOpen] = useState(false);
  const jobsState = useBookJobs(initialBook.id, () => {
    // Saved results are re-read so later edits here start from the generated pictures.
    void bookRepository.getBook(initialBook.id).then((stored) => {
      if (stored) setBook(stored);
    });
  });
  const [pendingDelete, setPendingDelete] = useState<Set<string> | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [printOutput, setPrintOutput] = useState<PrintOutput | undefined>();
  const [error, setError] = useState<AppError | null>(null);
  const hasPendingDelete = pendingDelete !== null;

  const saveBook = async (nextBook: Book) => {
    try {
      const saved = await bookRepository.save(nextBook, 'userEdit');
      setBook(saved);
      setError(null);
    } catch (saveError) {
      setError(toAppError(saveError));
    }
  };

  const reorder = useStoryReorder(book, (nextBook) => void saveBook(nextBook));
  const pairNumbers = buildSpreads({ ...book, storyPages: reorder.pairs.flat() })
    .filter((spread) => spread.kind === 'pair')
    .map((spread) => spread.index);
  const visiblePairs = reorder.pairs
    .map((pair, index) => ({ pair, pairNumber: pairNumbers[index] ?? index + 1 }))
    .filter(({ pair }) => !pendingDelete?.has(pair[0].id));

  const addPairs = async (count: number, atPairIndex: number) => {
    setAddOpen(false);
    await saveBook(addStoryPagePairs(book, count, atPairIndex));
  };

  const deletePairs = (pageIds: string[]) => {
    setDeleteOpen(false);
    const hiddenIds = new Set(pageIds);
    const oldBook = book;
    let deletionCommitted = false;
    setPendingDelete(hiddenIds);
    undoManager.registerUndo({
      label: `${pageIds.length} story pair${pageIds.length === 1 ? '' : 's'} will be deleted`,
      undo: async () => {
        if (deletionCommitted) {
          const restored = await bookRepository.save(oldBook, 'userEdit');
          setBook(restored);
        }
        setPendingDelete(null);
      },
      onExpire: async () => {
        let nextBook = oldBook;
        for (const pageId of pageIds) nextBook = deleteStoryPagePair(nextBook, pageId);
        try {
          const saved = await bookRepository.save(nextBook, 'userEdit');
          deletionCommitted = true;
          setBook(saved);
          await imageRepository.purgeOrphanImages(saved);
          setPendingDelete(null);
        } catch (deleteError) {
          if (!deletionCommitted) setPendingDelete(null);
          throw deleteError;
        }
      },
    });
  };

  return (
    <section aria-labelledby="book-heading" className="book-view">
      <header className="page-heading">
        <h2 id="book-heading">{book.title}</h2>
        <p>Your story, from the cover through the closing page.</p>
      </header>
      {error && (
        <Banner type="error" title={error.userMessage}>
          {error.nextStep}
        </Banner>
      )}
      <BookToolbar
        disabled={hasPendingDelete}
        onAdd={() => setAddOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onPreflight={() => {
          setPrintOutput(undefined);
          setPreflightOpen(true);
        }}
        onPrintBook={() => {
          setPrintOutput('book');
          setPreflightOpen(true);
        }}
        onPrintColouring={() => {
          setPrintOutput('colouring');
          setPreflightOpen(true);
        }}
        onPrintCover={() => {
          setPrintOutput('cover');
          setPreflightOpen(true);
        }}
        backupSlot={
          <BackupButton
            bookId={book.id}
            disabled={hasPendingDelete}
            lastBackupAt={book.lastBackupAt}
          />
        }
        onSettings={() => {
          window.location.hash = `#/book/${encodeURIComponent(book.id)}/settings`;
        }}
        generateChip={
          <GenerateStatusChip jobsState={jobsState} onOpen={() => setGenerateOpen(true)} />
        }
        onGenerate={() => setGenerateOpen(true)}
        pairCount={book.storyPages.length / 2}
      />
      <div className="book-outline surface-card">
        <CoverRow book={book} />
        <IntroRow book={book} />
        <div aria-label="Story pairs" className="story-pairs">
          <DndContext
            collisionDetection={closestCenter}
            onDragCancel={reorder.handleDragCancel}
            onDragEnd={reorder.handleDragEnd}
            onDragOver={reorder.handleDragOver}
            onDragStart={reorder.handleDragStart}
            sensors={reorder.sensors}
          >
            <SortableContext
              items={visiblePairs.flatMap(({ pair }) => pair.map((page) => page.id))}
              strategy={verticalListSortingStrategy}
            >
              {visiblePairs.map(({ pair, pairNumber }) => (
                <PairGroup
                  bookId={book.id}
                  disabled={hasPendingDelete}
                  firstPageNumber={(pairNumber - 1) * 2 + 1}
                  key={pair[0].id}
                  onMove={(pageId, newIndex) =>
                    void saveBook(moveStoryPage(book, pageId, newIndex))
                  }
                  pair={pair}
                  pairNumber={pairNumber}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <ColophonRow book={book} />
      </div>
      <AddPagesDialog
        onClose={() => setAddOpen(false)}
        onConfirm={(count, position) => void addPairs(count, position)}
        open={addOpen}
        pairCount={book.storyPages.length / 2}
      />
      <DeletePagesDialog
        onClose={() => setDeleteOpen(false)}
        onConfirm={deletePairs}
        open={deleteOpen}
        pairs={reorder.pairs}
      />
      <GenerateDialog
        book={book}
        jobsState={jobsState}
        onClose={() => setGenerateOpen(false)}
        open={generateOpen}
      />
      <PreflightDialog
        book={book}
        edition="colour"
        onConfirm={
          printOutput
            ? ({ coverEdition }) => startPrint(book.id, printOutput, undefined, coverEdition)
            : undefined
        }
        onClose={() => {
          setPreflightOpen(false);
          setPrintOutput(undefined);
        }}
        output={printOutput}
        open={preflightOpen}
      />
    </section>
  );
}
