// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { getPageRefsInReadingOrder } from '@/domain/ordering';
import type { PageRef } from '@/domain/page';

export interface ExportPage {
  pageRef: PageRef | null;
  blankFallback: boolean;
}

export interface ExportPageModel {
  pages: ExportPage[];
}

export function appendBlankFallbackPage(model: ExportPageModel): ExportPageModel {
  if (model.pages.length % 2 === 0) return model;
  return { ...model, pages: [...model.pages, { pageRef: null, blankFallback: true }] };
}

export function createExportPageModel(book: Book): ExportPageModel {
  return appendBlankFallbackPage({
    pages: getPageRefsInReadingOrder(book).map((pageRef) => ({ pageRef, blankFallback: false })),
  });
}
