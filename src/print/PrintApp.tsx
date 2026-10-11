// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import type { Book } from '@/domain/book';
import { AppError } from '@/shared/errors';
import { bookRepository, metaRepository } from '@/storage/repositories';
import { Banner } from '@/ui/Banner';
import { Spinner } from '@/ui/Spinner';
import { toAppError } from '@/shared/errors';
import { getPrintSpec } from '@/layout/specs';
import { PrintToolbar } from './PrintToolbar';
import { SheetView } from './SheetView';
import type { PrintDocumentModel, StoredPrintJob } from './printJob';
import { buildPrintDocument } from './printJob';
import { usePrintAssets, waitForPrintAssets } from './usePrintAssets';

export function buildPrintFileName(
  book: Book,
  output: StoredPrintJob['output'],
  coverEdition?: StoredPrintJob['coverEdition'],
): string {
  const suffix =
    output === 'colouring'
      ? 'colouring book'
      : output === 'page'
        ? 'page'
        : output === 'cover'
          ? coverEdition === 'colouring'
            ? 'colouring book cover'
            : 'cover'
          : 'print book';
  const safeTitle = book.title.replace(/[<>:"/\\|?*]/g, '-').trim() || 'Saprili';
  return `${safeTitle} - ${suffix}`;
}

export function injectPageStyle(sheetSizeMm: { widthMm: number; heightMm: number }): void {
  let style = document.getElementById('print-page-size') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'print-page-size';
    document.head.append(style);
  }
  style.textContent = `@page { size: ${sheetSizeMm.widthMm}mm ${sheetSizeMm.heightMm}mm; margin: 0; }`;
}

export function PrintApp() {
  const jobId = new URLSearchParams(window.location.search).get('job');
  const [job, setJob] = useState<StoredPrintJob | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [model, setModel] = useState<PrintDocumentModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [showGuides, setShowGuides] = useState(false);

  useEffect(() => {
    let active = true;
    if (!jobId) {
      setError(
        new AppError('PRINT_ASSET_FAILED', {
          userMessage: 'This print file could not be opened.',
          nextStep: 'Return to your book and start printing again.',
        }),
      );
      setLoading(false);
      return;
    }
    void metaRepository
      .get<StoredPrintJob>(`printJob:${jobId}`)
      .then(async (storedJob) => {
        if (!storedJob || storedJob.id !== jobId) {
          throw new Error('The saved print job was not found.');
        }
        const storedBook = await bookRepository.getBook(storedJob.bookId);
        if (!storedBook) throw new Error('The book for this print job was not found.');
        if (active) {
          setJob(storedJob);
          setBook(storedBook);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(toAppError(loadError, 'PRINT_ASSET_FAILED'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [jobId]);

  useEffect(() => {
    if (!job || !book) {
      setModel(null);
      return;
    }
    try {
      setModel(buildPrintDocument(book, job, getPrintSpec(book)));
    } catch (buildError) {
      setError(toAppError(buildError, 'PRINT_ASSET_FAILED'));
    }
  }, [book, job]);
  const assets = usePrintAssets(book, model);
  const activeError = error ?? assets.error;

  useEffect(() => {
    if (!book || !job || !model) return;
    injectPageStyle(
      model.sheets[0]?.sheetSizeMm ?? {
        widthMm: getPrintSpec(book).trim.widthMm,
        heightMm: getPrintSpec(book).trim.heightMm,
      },
    );
    document.title = buildPrintFileName(book, job.output, job.coverEdition);
  }, [book, job, model]);

  const print = async () => {
    if (!model) return;
    try {
      await waitForPrintAssets(model);
      window.print();
    } catch (printError) {
      setError(toAppError(printError, 'PRINT_ASSET_FAILED'));
    }
  };

  if (loading) {
    return (
      <div className="print-status" role="status">
        <Spinner /> Preparing print file…
      </div>
    );
  }
  if (activeError) {
    return (
      <main className="print-app">
        <Banner type="error" title={activeError.userMessage}>
          {activeError.nextStep}
        </Banner>
      </main>
    );
  }
  if (!book || !job || !model || assets.loading) {
    return (
      <div className="print-status" role="status">
        <Spinner /> Loading print assets…
      </div>
    );
  }

  return (
    <main className="print-app">
      <div className="print-screen-toolbar">
        <PrintToolbar
          busy={assets.loading}
          onGuidesChange={setShowGuides}
          onPrint={() => void print()}
        />
      </div>
      <div className="print-sheets">
        {model.sheets.map((sheet, index) => (
          <SheetView
            book={book}
            images={assets.images}
            key={`${sheet.pageRef?.kind ?? 'blank'}:${sheet.pageRef?.id ?? index}`}
            last={index === model.sheets.length - 1}
            pageNumber={index + 1}
            sheet={sheet}
            showGuides={showGuides}
          />
        ))}
      </div>
    </main>
  );
}
