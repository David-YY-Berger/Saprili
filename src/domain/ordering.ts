// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from './book';
import type { Colophon } from './colophon';
import { COLOPHON_PAGE_ID } from './constants';
import { createStoryPagePair } from './factories';
import type { IntroPage, PageRef, StoryPage } from './page';

export type StoryPair = [StoryPage, StoryPage];

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

export function moveStoryPage(book: Book, pageId: string, newIndex: number): Book {
  const currentIndex = getStoryPageIndex(book, pageId);
  if (currentIndex < 0 || !Number.isFinite(newIndex)) return book;
  const targetIndex = Math.max(0, Math.min(book.storyPages.length - 1, Math.trunc(newIndex)));
  if (currentIndex === targetIndex) return book;

  const storyPages = [...book.storyPages];
  const [page] = storyPages.splice(currentIndex, 1);
  if (!page) return book;
  storyPages.splice(targetIndex, 0, page);
  return { ...book, storyPages };
}

export function moveStoryPageUp(book: Book, pageId: string): Book {
  const index = getStoryPageIndex(book, pageId);
  return index <= 0 ? book : moveStoryPage(book, pageId, index - 1);
}

export function moveStoryPageDown(book: Book, pageId: string): Book {
  const index = getStoryPageIndex(book, pageId);
  return index < 0 || index >= book.storyPages.length - 1
    ? book
    : moveStoryPage(book, pageId, index + 1);
}

export function previewPairsAfterMove(book: Book, pageId: string, newIndex: number): StoryPair[] {
  const reordered = moveStoryPage(book, pageId, newIndex).storyPages;
  const pairs: StoryPair[] = [];
  for (let index = 0; index + 1 < reordered.length; index += 2) {
    pairs.push([reordered[index]!, reordered[index + 1]!]);
  }
  return pairs;
}

export function addStoryPagePairs(book: Book, count: number, atPairIndex?: number): Book {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError('The number of story-page pairs must be a positive integer.');
  }
  const pairCount = book.storyPages.length / 2;
  const insertionIndex = atPairIndex ?? pairCount;
  if (
    !Number.isInteger(insertionIndex) ||
    insertionIndex < 0 ||
    insertionIndex > pairCount
  ) {
    throw new RangeError('The insertion position must be an existing pair boundary.');
  }

  const additions = Array.from({ length: count }, () => createStoryPagePair()).flat();
  const storyPages = [...book.storyPages];
  storyPages.splice(insertionIndex * 2, 0, ...additions);
  return { ...book, storyPages };
}

export function deleteStoryPagePair(book: Book, pageId: string): Book {
  const index = getStoryPageIndex(book, pageId);
  if (index < 0) throw new RangeError(`Story page "${pageId}" does not exist.`);
  if (book.storyPages.length <= 2) {
    throw new RangeError('A book must keep at least one story-page pair.');
  }

  const pairStart = Math.floor(index / 2) * 2;
  return {
    ...book,
    storyPages: book.storyPages.filter(
      (_, pageIndex) => pageIndex < pairStart || pageIndex >= pairStart + 2,
    ),
  };
}
