// bisiyata dishmaya, leharbot ahava biyisral
import Papa from 'papaparse';
import type { Book } from '@/domain/book';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import { AppError } from '@/shared/errors';
import type { CsvIssue, CsvValidationResult } from './csvErrors';

export interface ParsedCsvRow {
  title: string;
  textEn: string;
  textHe: string;
  rowNumber: number;
}

export interface ParsedCsv {
  rows: ParsedCsvRow[];
  blankRows: number[];
  separatorRows: { rowNumber: number; dataRowsBefore: number }[];
  issues: CsvIssue[];
}

const HEADER_ALIASES: Record<'title' | 'english' | 'hebrew', readonly string[]> = {
  title: ['title', 'page_title', 'private_title', 'name'],
  english: ['english', 'en', 'eng', 'english_text', 'eng_text', 'eng_descrip'],
  hebrew: ['hebrew', 'he', 'heb', 'hebrew_text', 'heb_text', 'heb_descr'],
};

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s-]+/g, '_');
}

function isBlankRow(row: string[]): boolean {
  return row.every((cell) => cell.trim() === '');
}

function isSeparatorRow(row: string[]): boolean {
  const title = row[0]?.trim() ?? '';
  return (
    row.length === 3 &&
    /^-+$/.test(title) &&
    (row[1]?.trim() ?? '') === '' &&
    (row[2]?.trim() ?? '') === ''
  );
}

function findHeader(
  row: string[],
): { indexes: [number, number, number] | null; looksLikeHeader: boolean } {
  const roles = ['title', 'english', 'hebrew'] as const;
  const indexes = new Map<(typeof roles)[number], number>();
  row.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    for (const role of roles) {
      if (!HEADER_ALIASES[role].includes(normalized)) continue;
      if (!indexes.has(role)) indexes.set(role, index);
      else indexes.set(role, -1);
    }
  });
  const titleIndex = indexes.get('title');
  const englishIndex = indexes.get('english');
  const hebrewIndex = indexes.get('hebrew');
  const looksLikeHeader =
    indexes.has('title') ||
    (titleIndex !== undefined && englishIndex !== undefined && hebrewIndex !== undefined);
  if (
    titleIndex !== undefined &&
    titleIndex >= 0 &&
    englishIndex !== undefined &&
    englishIndex >= 0 &&
    hebrewIndex !== undefined &&
    hebrewIndex >= 0
  ) {
    return { indexes: [titleIndex, englishIndex, hebrewIndex], looksLikeHeader };
  }
  return { indexes: null, looksLikeHeader };
}

function containsMojibake(value: string): boolean {
  return /[\uFFFD]|\u00c3.|\u00c2.|\u00e2\u20ac|\u00f0\u0178|\u00d0[\u0400-\u04ff]|\u00d1[\u0400-\u04ff]|(?:\u00d7[\u0080-\u00ff]){2,}/u.test(
    value,
  );
}

function getRecordStartLines(text: string): number[] {
  const startLines = [1];
  let line = 1;
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (character !== '\r' && character !== '\n') continue;
    if (character === '\r' && text[index + 1] === '\n') index += 1;
    line += 1;
    if (!inQuotes) startLines.push(line);
  }
  return startLines;
}

export function decodeCsvBuffer(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    throw new AppError('CSV_BAD_ENCODING', { cause: error });
  }
  if (containsMojibake(text)) throw new AppError('CSV_BAD_ENCODING');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseBookCsv(buffer: ArrayBuffer | Uint8Array): ParsedCsv {
  const text = decodeCsvBuffer(buffer);
  const parsed = Papa.parse<string[]>(text, {
    delimiter: ',',
    dynamicTyping: false,
    skipEmptyLines: false,
  });
  const recordStartLines = getRecordStartLines(text);
  const issues: CsvIssue[] = parsed.errors.map((error) => ({
    code: 'CSV_BAD_COLUMNS',
    rows: [recordStartLines[error.row] ?? error.row + 1],
  }));
  const rows: ParsedCsvRow[] = [];
  const blankRows: number[] = [];
  const separatorRows: ParsedCsv['separatorRows'] = [];
  let firstNonBlankSeen = false;
  let headerIndexes: [number, number, number] = [0, 1, 2];

  parsed.data.forEach((rawRow, index) => {
    const rowNumber = recordStartLines[index] ?? index + 1;
    if (isBlankRow(rawRow)) {
      blankRows.push(rowNumber);
      return;
    }

    if (!firstNonBlankSeen) {
      firstNonBlankSeen = true;
      const header = findHeader(rawRow);
      if (header.looksLikeHeader) {
        if (!header.indexes || rawRow.length !== 3) {
          issues.push({ code: 'CSV_BAD_COLUMNS', rows: [rowNumber] });
        } else {
          headerIndexes = header.indexes;
        }
        return;
      }
    }

    if (isSeparatorRow(rawRow)) {
      separatorRows.push({ rowNumber, dataRowsBefore: rows.length });
      return;
    }

    if (rawRow.length !== 3) {
      issues.push({ code: 'CSV_BAD_COLUMNS', rows: [rowNumber] });
      return;
    }
    const [titleIndex, englishIndex, hebrewIndex] = headerIndexes;
    rows.push({
      title: rawRow[titleIndex] ?? '',
      textEn: rawRow[englishIndex] ?? '',
      textHe: rawRow[hebrewIndex] ?? '',
      rowNumber,
    });
  });

  return { rows, blankRows, separatorRows, issues };
}

export function validateParsedCsv(parsed: ParsedCsv): CsvValidationResult {
  const issues = [...parsed.issues];
  if (parsed.rows.length === 0) {
    issues.push({
      code: 'CSV_EMPTY_ROWS',
      rows: [parsed.blankRows[0] ?? parsed.separatorRows[0]?.rowNumber ?? 1],
    });
  } else {
    if ((parsed.rows.length - 1) % 2 !== 0) {
      issues.push({ code: 'CSV_ODD_ROWS', rows: [parsed.rows[parsed.rows.length - 1]!.rowNumber] });
    }
    for (const separator of parsed.separatorRows) {
      const storyRowsBefore = separator.dataRowsBefore - 1;
      if (separator.dataRowsBefore < 1 || storyRowsBefore % 2 !== 0) {
        issues.push({ code: 'CSV_ODD_ROWS', rows: [separator.rowNumber] });
      }
    }
  }

  const uniqueIssues = new Map<string, CsvIssue>();
  for (const issue of issues) {
    const rows = [...new Set(issue.rows)].sort((a, b) => a - b);
    uniqueIssues.set(`${issue.code}:${rows.join(',')}`, { code: issue.code, rows });
  }
  const result = [...uniqueIssues.values()];
  return { valid: result.length === 0, issues: result };
}

export function buildBookFromCsv(parsed: ParsedCsv, nowIso: string): Book {
  const validation = validateParsedCsv(parsed);
  if (!validation.valid) {
    const firstIssue = validation.issues[0]!;
    throw new AppError(firstIssue.code, {
      detail: firstIssue.rows.length > 0 ? `CSV rows ${firstIssue.rows.join(', ')}` : undefined,
    });
  }

  const [introRow, ...storyRows] = parsed.rows;
  if (!introRow) throw new AppError('CSV_EMPTY_ROWS');
  const book = createEmptyBook({ nowIso, title: 'book1' });
  book.intro = {
    ...book.intro,
    privateTitle: introRow.title,
    textEn: introRow.textEn,
    textHe: introRow.textHe,
  };
  book.storyPages = storyRows.map((row) =>
    createStoryPage({ privateTitle: row.title, textEn: row.textEn, textHe: row.textHe }),
  );
  return book;
}
