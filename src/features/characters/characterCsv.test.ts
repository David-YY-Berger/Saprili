// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { parseCharacterCsv } from './characterCsv';

const bytes = (value: string) => new TextEncoder().encode(value);

describe('character CSV', () => {
  it('reads UTF-8 headers, quoted commas, quotes and multiline descriptions', () => {
    expect(parseCharacterCsv(bytes('\uFEFF Desc,NAME\r\n"Kind, ""brave""\nand funny", Maya \r\n\r\n,Noah\r\n'))).toEqual([
      { name: 'Maya', description: 'Kind, "brave"\nand funny' },
      { name: 'Noah', description: '' },
    ]);
  });

  it.each([
    '',
    'name,description\nMaya,Kind',
    'name,desc',
    'name,desc\nMaya,Kind\nNoah',
    'name,desc\nMaya,Kind\n,Missing name',
    'name,desc\nMaya,"unterminated',
  ])('rejects invalid CSV without producing characters: %s', (value) => {
    expect(() => parseCharacterCsv(bytes(value))).toThrow();
  });

  it('rejects invalid UTF-8', () => {
    expect(() => parseCharacterCsv(new Uint8Array([0xff]))).toThrowError(
      expect.objectContaining({ code: 'CSV_BAD_ENCODING' }),
    );
  });
});
