// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from './book';
import type { Colophon } from './colophon';
import { COLOPHON_PAGE_ID } from './constants';
import type { IntroPage, PageRef, StoryPage } from './page';

/** Intro + story pages + colophon. */
export function getInteriorPageCount(book: Book): number {
  return book.storyPages.length + 2;
}

export function isInteriorPageCountEven(book: Book): boolean {
  return getInteriorPageCount(book) % 2 === 0;
}

export function getPageRefsInReadingOrder(book: Book): PageRef[] {
  return [
    { kind: 'intro', id: book.intro.id },
    ...book.storyPages.map((p): PageRef => ({ kind: 'story', id: p.id })),
    { kind: 'colophon', id: COLOPHON_PAGE_ID },
  ];
}

export function findPage(book: Book, ref: PageRef): IntroPage | StoryPage | Colophon | undefined {
  switch (ref.kind) {
    case 'intro':
      return ref.id === book.intro.id ? book.intro : undefined;
    case 'colophon':
      return ref.id === COLOPHON_PAGE_ID ? book.colophon : undefined;
    case 'story':
      return book.storyPages.find((p) => p.id === ref.id);
  }
}

/** Zero-based index among story pages, or -1 when not found. */
export function getStoryPageIndex(book: Book, pageId: string): number {
  return book.storyPages.findIndex((p) => p.id === pageId);
}
