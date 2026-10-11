// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import type { Book } from './book';
import * as constants from './constants';
import { COLOPHON_PAGE_ID, PLACEHOLDER_KEYS } from './constants';
import { createEmptyBook, createStoryPage, createStoryPagePair } from './factories';
import { listReferencedImageIds, remapImageIds } from './imageRefs';
import {
  findPage,
  getInteriorPageCount,
  getPageRefsInReadingOrder,
  getStoryPageIndex,
  isInteriorPageCountEven,
} from './ordering';
import { buildSpreads } from './spreads';
import { validateBook } from './validators';

const NOW = '2026-01-01T00:00:00.000Z';

export function makeBook(pairs: number, bindingSide: Book['bindingSide'] = 'right'): Book {
  const book = createEmptyBook({ id: 'b1', nowIso: NOW });
  book.bindingSide = bindingSide;
  book.storyPages = Array.from({ length: pairs }, () => createStoryPagePair()).flat();
  return book;
}

describe('constants', () => {
  it('placeholder keys are real exports', () => {
    for (const key of PLACEHOLDER_KEYS) expect(constants).toHaveProperty(key);
  });
});

describe('buildSpreads', () => {
  it('right binding with 0 story pages: intro left, colophon right', () => {
    const book = makeBook(0);
    const spreads = buildSpreads(book);
    expect(spreads).toHaveLength(2);
    expect(spreads[0]).toMatchObject({ index: 0, kind: 'intro', right: null });
    expect(spreads[0]!.left).toEqual({ kind: 'intro', id: book.intro.id });
    expect(spreads[1]).toMatchObject({ index: 1, kind: 'colophon', left: null });
    expect(spreads[1]!.right).toEqual({ kind: 'colophon', id: COLOPHON_PAGE_ID });
  });

  it('right binding: pairs read right to left', () => {
    const book = makeBook(1);
    const [a, b] = book.storyPages;
    const pair = buildSpreads(book)[1]!;
    expect(pair.kind).toBe('pair');
    expect(pair.right).toEqual({ kind: 'story', id: a!.id });
    expect(pair.left).toEqual({ kind: 'story', id: b!.id });
  });

  it('left binding mirrors everything', () => {
    const book = makeBook(1, 'left');
    const [a, b] = book.storyPages;
    const spreads = buildSpreads(book);
    expect(spreads[0]).toMatchObject({ kind: 'intro', left: null });
    expect(spreads[0]!.right).toEqual({ kind: 'intro', id: book.intro.id });
    expect(spreads[1]!.left).toEqual({ kind: 'story', id: a!.id });
    expect(spreads[1]!.right).toEqual({ kind: 'story', id: b!.id });
    expect(spreads[2]).toMatchObject({ kind: 'colophon', right: null });
    expect(spreads[2]!.left).toEqual({ kind: 'colophon', id: COLOPHON_PAGE_ID });
  });

  it.each(['right', 'left'] as const)('%s binding with 6 story pages', (side) => {
    const book = makeBook(3, side);
    const spreads = buildSpreads(book);
    expect(spreads.map((s) => s.kind)).toEqual(['intro', 'pair', 'pair', 'pair', 'colophon']);
    expect(spreads.map((s) => s.index)).toEqual([0, 1, 2, 3, 4]);
    const shown = spreads.flatMap((s) => [s.left, s.right]).filter((r) => r !== null);
    expect(shown).toHaveLength(getInteriorPageCount(book));
  });
});

describe('ordering', () => {
  it('page counts and reading order', () => {
    const book = makeBook(2);
    expect(getInteriorPageCount(book)).toBe(6);
    expect(isInteriorPageCountEven(book)).toBe(true);
    const refs = getPageRefsInReadingOrder(book);
    expect(refs.map((r) => r.kind)).toEqual([
      'intro',
      'story',
      'story',
      'story',
      'story',
      'colophon',
    ]);
  });

  it('findPage and getStoryPageIndex', () => {
    const book = makeBook(1);
    const second = book.storyPages[1]!;
    expect(findPage(book, { kind: 'story', id: second.id })).toBe(second);
    expect(findPage(book, { kind: 'intro', id: book.intro.id })).toBe(book.intro);
    expect(findPage(book, { kind: 'colophon', id: COLOPHON_PAGE_ID })).toBe(book.colophon);
    expect(findPage(book, { kind: 'story', id: 'nope' })).toBeUndefined();
    expect(getStoryPageIndex(book, second.id)).toBe(1);
    expect(getStoryPageIndex(book, 'nope')).toBe(-1);
  });
});

describe('validateBook', () => {
  it('accepts a fresh book', () => {
    expect(validateBook(makeBook(2))).toEqual([]);
  });

  it('flags odd story counts, low margins, long history and duplicate ids', () => {
    const book = makeBook(1);
    book.storyPages.push(createStoryPage({ id: book.storyPages[0]!.id }));
    book.layout.gutterMm = 5;
    book.cover.illustration.history = Array.from({ length: 4 }, (_, i) => ({
      imageId: `i${i}`,
      replacedAt: NOW,
    }));
    const codes = validateBook(book)
      .map((p) => p.code)
      .sort();
    expect(codes).toEqual(
      ['DUPLICATE_ID', 'HISTORY_TOO_LONG', 'MARGIN_BELOW_FLOOR', 'STORY_COUNT_ODD'].sort(),
    );
  });
});

describe('imageRefs', () => {
  it('lists and remaps every reference', () => {
    const book = makeBook(1);
    book.intro.photos = [{ originalImageId: 'o1', aiCopyImageId: 'a1' }];
    book.storyPages[0]!.illustration = {
      currentImageId: 'ill2',
      history: [{ imageId: 'ill1', replacedAt: NOW }],
      customPrompt: '',
      useEditMode: false,
    };
    book.storyPages[0]!.colouring.imageId = 'col1';
    book.cover.ownImageId = 'cov';
    book.colophon.qrImageId = 'qr';

    expect([...listReferencedImageIds(book)].sort()).toEqual(
      ['a1', 'col1', 'cov', 'ill1', 'ill2', 'o1', 'qr'].sort(),
    );

    const copy = remapImageIds(
      book,
      new Map([
        ['o1', 'X'],
        ['ill2', 'Y'],
        ['qr', 'Z'],
      ]),
    );
    expect(copy.intro.photos[0]!.originalImageId).toBe('X');
    expect(copy.storyPages[0]!.illustration.currentImageId).toBe('Y');
    expect(copy.colophon.qrImageId).toBe('Z');
    expect(copy.cover.ownImageId).toBe('cov');
    expect(book.intro.photos[0]!.originalImageId).toBe('o1');
  });
});
