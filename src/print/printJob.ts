// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { PageRef } from '@/domain/page';
import { buildSpreads } from '@/domain/spreads';
import {
  INTERIOR_BLEED_MM,
  COVER_BLEED_MM,
  CROP_MARK_LENGTH_MM,
  CROP_MARK_OFFSET_MM,
} from '@/domain/constants';
import { computeCoverGeometry } from '@/layout/coverGeometry';
import { newId } from '@/shared/ids';
import { AppError } from '@/shared/errors';
import { bookRepository, metaRepository } from '@/storage/repositories';
import type { Edition } from '@/layout/theme';
import { createExportPageModel } from './pageModel';

export type PrintOutput = 'book' | 'colouring' | 'cover' | 'page';

export interface PrintJobSpec {
  bookId: string;
  output: PrintOutput;
  pageId?: string;
  sheetMode: Book['print']['sheetMode'];
  coverEdition?: Edition;
}

export interface StoredPrintJob extends PrintJobSpec {
  id: string;
  createdAt: string;
}

export interface RectMm {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SheetPlacementMm {
  leftMm: number;
  topMm: number;
  widthMm: number;
  heightMm: number;
}

export interface SheetLayout {
  sheetSizeMm: { widthMm: number; heightMm: number };
  placementMm: SheetPlacementMm;
  trimRect: RectMm;
}

export interface SheetModel extends SheetLayout {
  pageRef: PageRef | null;
  side: 'left' | 'right';
  edition: Edition;
  /** Bleed around the trim for this sheet; the cover's is larger than a page's. */
  bleedMm: number;
  /** True for the flat cover sheet, which has no page reference. */
  isCover?: boolean;
}

export interface PrintDocumentModel {
  sheets: SheetModel[];
}

export function computeSheetLayout(
  printSpec: {
    trim: { widthMm: number; heightMm: number };
    bleedMm: number;
    cropMark: { lengthMm: number; offsetMm: number };
  },
  sheetMode: Book['print']['sheetMode'],
): SheetLayout {
  const { widthMm, heightMm } = printSpec.trim;
  const markZone = printSpec.cropMark.offsetMm + printSpec.cropMark.lengthMm;
  const edgeSpace = printSpec.bleedMm + markZone;
  const requiredWidth = widthMm + edgeSpace * 2;
  const requiredHeight = heightMm + edgeSpace * 2;
  const sheetWidth = sheetMode === 'centredA4' ? Math.max(210, requiredWidth) : requiredWidth;
  const sheetHeight = sheetMode === 'centredA4' ? Math.max(297, requiredHeight) : requiredHeight;
  const leftMm = (sheetWidth - (widthMm + printSpec.bleedMm * 2)) / 2;
  const topMm = (sheetHeight - (heightMm + printSpec.bleedMm * 2)) / 2;

  return {
    sheetSizeMm: { widthMm: sheetWidth, heightMm: sheetHeight },
    placementMm: {
      leftMm,
      topMm,
      widthMm: widthMm + printSpec.bleedMm * 2,
      heightMm: heightMm + printSpec.bleedMm * 2,
    },
    trimRect: {
      x: leftMm + printSpec.bleedMm,
      y: topMm + printSpec.bleedMm,
      width: widthMm,
      height: heightMm,
    },
  };
}

function getPageSide(book: Book, pageRef: PageRef): 'left' | 'right' {
  for (const spread of buildSpreads(book)) {
    if (spread.left?.id === pageRef.id && spread.left.kind === pageRef.kind) return 'left';
    if (spread.right?.id === pageRef.id && spread.right.kind === pageRef.kind) return 'right';
  }
  return 'right';
}

export function buildPrintDocument(
  book: Book,
  spec: PrintJobSpec,
  printSpec = {
    trim: { widthMm: book.format.trimWidthMm, heightMm: book.format.trimHeightMm },
    bleedMm: INTERIOR_BLEED_MM,
    cropMark: { lengthMm: CROP_MARK_LENGTH_MM, offsetMm: CROP_MARK_OFFSET_MM },
  },
): PrintDocumentModel {
  if (spec.output === 'cover') {
    const { cutRect } = computeCoverGeometry(book);
    const layout = computeSheetLayout(
      {
        trim: { widthMm: cutRect.width, heightMm: cutRect.height },
        bleedMm: COVER_BLEED_MM,
        // The bindery template (BOOK-BIND) wants exactly cut + bleed (466 x 327 mm) and no marks or scales.
        cropMark: { lengthMm: 0, offsetMm: 0 },
      },
      'exact',
    );
    return {
      sheets: [
        {
          ...layout,
          pageRef: null,
          side: 'right',
          edition: spec.coverEdition ?? 'colour',
          bleedMm: COVER_BLEED_MM,
          isCover: true,
        },
      ],
    };
  }
  const layout = computeSheetLayout(printSpec, spec.sheetMode);
  const edition: Edition = spec.output === 'colouring' ? 'colouring' : 'colour';
  let sheetRefs = createExportPageModel(book).pages.map((page) => page.pageRef);
  if (spec.output === 'page') {
    const selected = sheetRefs.find((ref) => ref?.id === spec.pageId);
    if (!spec.pageId || !selected) {
      throw new AppError('PRINT_ASSET_FAILED', {
        userMessage: 'The selected page could not be found.',
        nextStep: 'Return to the book and choose a page to print.',
      });
    }
    sheetRefs = [selected];
  }

  return {
    sheets: sheetRefs.map((pageRef) => ({
      ...layout,
      pageRef,
      side: pageRef ? getPageSide(book, pageRef) : 'right',
      edition,
      bleedMm: printSpec.bleedMm,
    })),
  };
}

export async function createPrintJob(spec: PrintJobSpec): Promise<StoredPrintJob> {
  const job: StoredPrintJob = {
    ...spec,
    id: newId(),
    createdAt: new Date().toISOString(),
  };
  await metaRepository.set(`printJob:${job.id}`, job);
  return job;
}

export async function openPrintTab(
  jobId: string,
  popup: Window | null = window.open('', '_blank'),
): Promise<void> {
  if (!popup) {
    throw new AppError('PRINT_ASSET_FAILED', {
      userMessage: 'The print tab could not be opened.',
      nextStep: 'Allow pop-ups for Saprili, then try printing again.',
    });
  }

  try {
    const printUrl = new URL('print.html', window.location.href);
    printUrl.searchParams.set('job', jobId);
    popup.location.replace(printUrl.href);
  } catch (error) {
    popup.close();
    throw new AppError('PRINT_ASSET_FAILED', {
      cause: error,
      userMessage: 'The print tab could not be opened.',
      nextStep: 'Return to the book and try printing again.',
    });
  }
}

export async function startPrint(
  bookId: string,
  output: PrintOutput,
  pageId?: string,
  coverEdition?: Edition,
): Promise<void> {
  const popup = window.open('', '_blank');
  try {
    const book = await bookRepository.getBook(bookId);
    if (!book) throw new Error(`Book "${bookId}" was not found.`);
    const spec: PrintJobSpec = {
      bookId,
      output,
      ...(pageId ? { pageId } : {}),
      ...(output === 'cover' ? { coverEdition: coverEdition ?? 'colour' } : {}),
      sheetMode: book.print.sheetMode,
    };
    const job = await createPrintJob(spec);
    await openPrintTab(job.id, popup);
  } catch (error) {
    popup?.close();
    throw error;
  }
}
