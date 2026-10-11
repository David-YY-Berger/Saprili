// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { AppError } from '@/shared/errors';
import {
  buildBookFromCsv,
  decodeCsvBuffer,
  parseBookCsv,
  validateParsedCsv,
} from './csvParser';

const bytes = (value: string) => new TextEncoder().encode(value);

describe('CSV parsing and validation', () => {
  it('decodes UTF-8 with and without a BOM', () => {
    expect(decodeCsvBuffer(bytes('\uFEFFtitle,en,he'))).toBe('title,en,he');
    expect(decodeCsvBuffer(bytes('title,en,he'))).toBe('title,en,he');
  });

  it('recognizes actual header aliases, blank lines and pair separators', () => {
    const parsed = parseBookCsv(
      bytes(
        '\uFEFFTitle,eng_descrip,heb_descr\r\nintro,English intro,עברית\r\n---------,,\r\none,"first line\nsecond line",א\r\ntwo,English two,ב\r\n---------,,\r\n',
      ),
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.rows.map((row) => row.title)).toEqual(['intro', 'one', 'two']);
    expect(parsed.rows[1]?.textEn).toBe('first line\nsecond line');
    expect(parsed.separatorRows.map((row) => row.dataRowsBefore)).toEqual([1, 3]);
    expect(validateParsedCsv(parsed)).toEqual({ valid: true, issues: [] });
  });

  it('treats the first data row as intro when there is no header', () => {
    const parsed = parseBookCsv(bytes('intro,English intro,עברית\r\none,English one,א\r\ntwo,English two,ב'));
    expect(parsed.rows.map((row) => row.title)).toEqual(['intro', 'one', 'two']);
    expect(validateParsedCsv(parsed).valid).toBe(true);
  });

  it('reports wrong column counts and odd story-page counts with source rows', () => {
    const wrongColumns = parseBookCsv(bytes('title,en,he\nintro,English,עברית\npage,English'));
    expect(validateParsedCsv(wrongColumns).issues).toContainEqual({
      code: 'CSV_BAD_COLUMNS',
      rows: [3],
    });

    const oddRows = parseBookCsv(bytes('intro,English,עברית\npage,English,א'));
    expect(validateParsedCsv(oddRows).issues).toContainEqual({
      code: 'CSV_ODD_ROWS',
      rows: [2],
    });
  });

  it('ignores entirely blank records but rejects separator lines that split a pair', () => {
    const valid = parseBookCsv(bytes('\nintro,English,עברית\n\none,English,א\ntwo,English,ב\n'));
    expect(validateParsedCsv(valid).valid).toBe(true);

    const splitPair = parseBookCsv(
      bytes('intro,English,עברית\none,English,א\n---------,,\ntwo,English,ב'),
    );
    expect(validateParsedCsv(splitPair).issues).toContainEqual({
      code: 'CSV_ODD_ROWS',
      rows: [3],
    });
  });

  it('reports a file without any page rows', () => {
    const parsed = parseBookCsv(bytes('\n---------,,\n'));
    expect(validateParsedCsv(parsed).issues).toContainEqual({
      code: 'CSV_EMPTY_ROWS',
      rows: [1],
    });
  });

  it('rejects malformed UTF-8 and likely mojibake', () => {
    expect(() => decodeCsvBuffer(new Uint8Array([0xe0, 0xe1, 0xe2]))).toThrowError(
      expect.objectContaining({ code: 'CSV_BAD_ENCODING' }),
    );
    expect(() => decodeCsvBuffer(bytes('name,Ã©'))).toThrowError(
      expect.objectContaining({ code: 'CSV_BAD_ENCODING' }),
    );
    expect(() => decodeCsvBuffer(bytes('text,×©×××'))).toThrowError(
      expect.objectContaining({ code: 'CSV_BAD_ENCODING' }),
    );
  });

  it('builds the intro and paired stories using the standard book defaults', () => {
    const parsed = parseBookCsv(bytes('intro,English intro,עברית\none,English one,א\ntwo,English two,ב'));
    const book = buildBookFromCsv(parsed, '2026-10-11T00:00:00.000Z');

    expect(book.title).toBe('book1');
    expect(book.format.lockedAt).toBeNull();
    expect(book.shape).toBeNull();
    expect(book.intro).toMatchObject({
      privateTitle: 'intro',
      textEn: 'English intro',
      textHe: 'עברית',
    });
    expect(book.storyPages.map((page) => page.privateTitle)).toEqual(['one', 'two']);
    expect(book.colophon.place).toBe('Jerusalem');
  });

  it('does not build an invalid book', () => {
    const parsed = parseBookCsv(bytes('intro,English,עברית\npage,English,א'));
    expect(() => buildBookFromCsv(parsed, '2026-10-11T00:00:00.000Z')).toThrow(AppError);
  });
});
