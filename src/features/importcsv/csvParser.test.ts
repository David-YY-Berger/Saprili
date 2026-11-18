// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { AppError } from '@/shared/errors';
import {
  buildStoryPagesFromCsv,
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
        '\uFEFFTitle,eng_descrip,heb_descr\r\n---------,,\r\none,"first line\nsecond line",a\r\ntwo,English two,b\r\n---------,,\r\n',
      ),
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.rows.map((row) => row.title)).toEqual(['one', 'two']);
    expect(parsed.rows[0]?.textEn).toBe('first line\nsecond line');
    expect(parsed.separatorRows.map((row) => row.dataRowsBefore)).toEqual([0, 2]);
    expect(validateParsedCsv(parsed)).toEqual({ valid: true, issues: [] });
  });

  it('treats the first data row as a story page when there is no header', () => {
    const parsed = parseBookCsv(bytes('one,English one,a\r\ntwo,English two,b'));
    expect(parsed.rows.map((row) => row.title)).toEqual(['one', 'two']);
    expect(validateParsedCsv(parsed).valid).toBe(true);
  });

  it('reports wrong column counts and odd story-page counts with source rows', () => {
    const wrongColumns = parseBookCsv(bytes('title,en,he\none,English,a\npage,English'));
    expect(validateParsedCsv(wrongColumns).issues).toContainEqual({
      code: 'CSV_BAD_COLUMNS',
      rows: [3],
    });

    const oddRows = parseBookCsv(bytes('one,English,a\ntwo,English,b\nthree,English,c'));
    expect(validateParsedCsv(oddRows).issues).toContainEqual({
      code: 'CSV_ODD_ROWS',
      rows: [3],
    });
  });

  it('ignores entirely blank records but rejects separator lines that split a pair', () => {
    const valid = parseBookCsv(bytes('\none,English,a\n\ntwo,English,b\n'));
    expect(validateParsedCsv(valid).valid).toBe(true);

    const splitPair = parseBookCsv(bytes('one,English,a\n---------,,\ntwo,English,b'));
    expect(validateParsedCsv(splitPair).issues).toContainEqual({
      code: 'CSV_ODD_ROWS',
      rows: [2],
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
  });

  it('builds one story page per row', () => {
    const parsed = parseBookCsv(bytes('one,English one,a\ntwo,English two,b'));
    const pages = buildStoryPagesFromCsv(parsed);
    expect(pages.map((page) => page.privateTitle)).toEqual(['one', 'two']);
    expect(pages[1]?.textEn).toBe('English two');
  });

  it('does not build pages from an invalid file', () => {
    const parsed = parseBookCsv(bytes('one,English,a'));
    expect(() => buildStoryPagesFromCsv(parsed)).toThrow(AppError);
  });
});
