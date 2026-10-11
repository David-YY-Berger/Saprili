// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import { appendBlankFallbackPage, createExportPageModel } from './pageModel';

describe('export page model', () => {
  it('adds a blank fallback only to an odd page count', () => {
    const even = { pages: [{ pageRef: null, blankFallback: false }, { pageRef: null, blankFallback: false }] };
    expect(appendBlankFallbackPage(even)).toBe(even);
    const odd = { pages: [{ pageRef: null, blankFallback: false }] };
    expect(appendBlankFallbackPage(odd).pages.at(-1)).toEqual({
      pageRef: null,
      blankFallback: true,
    });
  });

  it('builds the export model from reading order and retains an even fallback count', () => {
    const book = createEmptyBook({ id: 'odd', nowIso: '2026-01-01T00:00:00.000Z' });
    book.storyPages = [createStoryPage(), createStoryPage(), createStoryPage()];
    const model = createExportPageModel(book);
    expect(model.pages).toHaveLength(6);
    expect(model.pages.at(-1)).toMatchObject({ pageRef: null, blankFallback: true });
    expect(model.pages[0]?.pageRef?.kind).toBe('intro');
    expect(model.pages[model.pages.length - 2]?.pageRef?.kind).toBe('colophon');
  });
});
