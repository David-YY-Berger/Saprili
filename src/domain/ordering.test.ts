// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from './factories';
import {
  addStoryPagePairs,
  deleteStoryPagePair,
  moveStoryPage,
  moveStoryPageDown,
  moveStoryPageUp,
  previewPairsAfterMove,
} from './ordering';

function makeBook() {
  const book = createEmptyBook({ id: 'book', nowIso: '2026-10-11T00:00:00.000Z' });
  book.storyPages = ['a', 'b', 'c', 'd'].map((id) =>
    createStoryPage({ id, privateTitle: id }),
  );
  return book;
}

describe('story page ordering', () => {
  it('moves pages without changing their content, intro, or colophon', () => {
    const book = makeBook();
    const moved = moveStoryPage(book, 'a', 2);

    expect(moved.storyPages.map((page) => page.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(moved.storyPages[2]).toBe(book.storyPages[0]);
    expect(moved.intro).toBe(book.intro);
    expect(moved.colophon).toBe(book.colophon);
    expect(book.storyPages.map((page) => page.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('moves one page up or down and leaves edge pages in place', () => {
    const book = makeBook();
    expect(moveStoryPageUp(book, 'a')).toBe(book);
    expect(moveStoryPageDown(book, 'd')).toBe(book);
    expect(moveStoryPageDown(book, 'a').storyPages.map((page) => page.id)).toEqual([
      'b',
      'a',
      'c',
      'd',
    ]);
    expect(moveStoryPageUp(book, 'd').storyPages.map((page) => page.id)).toEqual([
      'a',
      'b',
      'd',
      'c',
    ]);
  });

  it('previews the pair regrouping after a move', () => {
    const book = makeBook();
    expect(
      previewPairsAfterMove(book, 'a', 2).map((pair) => pair.map((page) => page.id)),
    ).toEqual([
      ['b', 'c'],
      ['a', 'd'],
    ]);
  });

  it('adds pairs at a selected pair boundary', () => {
    const book = makeBook();
    const added = addStoryPagePairs(book, 2, 1);

    expect(added.storyPages).toHaveLength(8);
    expect(added.storyPages.slice(0, 2)).toEqual(book.storyPages.slice(0, 2));
    expect(added.storyPages.slice(6)).toEqual(book.storyPages.slice(2));
    expect(new Set(added.storyPages.map((page) => page.id)).size).toBe(8);
    expect(book.storyPages).toHaveLength(4);
  });

  it('deletes the whole pair containing a selected page and keeps the other pairs', () => {
    const book = makeBook();
    const added = addStoryPagePairs(book, 1);
    expect(deleteStoryPagePair(added, 'c').storyPages.map((page) => page.id)).toEqual([
      'a',
      'b',
      added.storyPages[4]!.id,
      added.storyPages[5]!.id,
    ]);
    expect(deleteStoryPagePair(book, 'a').storyPages.map((page) => page.id)).toEqual([
      'c',
      'd',
    ]);
    expect(() => deleteStoryPagePair(book, 'missing')).toThrow(RangeError);
  });

  it('does not allow deleting the minimum remaining pair', () => {
    const book = makeBook();
    book.storyPages = book.storyPages.slice(0, 2);
    expect(() => deleteStoryPagePair(book, 'a')).toThrow(RangeError);
  });
});
