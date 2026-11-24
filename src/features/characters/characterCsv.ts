// bisiyata dishmaya, leharbot ahava biyisral
import Papa from 'papaparse';
import { decodeCsvBuffer } from '@/features/importcsv/csvParser';
import { AppError } from '@/shared/errors';

export function parseCharacterCsv(buffer: ArrayBuffer | Uint8Array): { name: string; description: string }[] {
  let text: string;
  try {
    text = decodeCsvBuffer(buffer);
  } catch (error) {
    if (error instanceof AppError && error.code === 'CSV_BAD_ENCODING') {
      throw new AppError('CSV_BAD_ENCODING', {
        userMessage: 'The character CSV is not readable.',
        nextStep: 'Save the file as CSV UTF-8 and choose it again.',
        cause: error,
      });
    }
    throw error;
  }
  const parsed = Papa.parse<string[]>(text, {
    delimiter: ',',
    dynamicTyping: false,
    skipEmptyLines: false,
  });
  const invalid = (message: string) =>
    new AppError('CSV_BAD_COLUMNS', {
      userMessage: message,
      nextStep: 'Use a UTF-8 CSV with headers name,desc and a name for each character, then try again.',
    });

  if (parsed.errors.length > 0) throw invalid('The character CSV could not be parsed.');
  const rows = parsed.data.filter((row) => row.some((cell) => cell.trim() !== ''));
  const header = rows.shift()?.map((cell) => cell.trim().toLowerCase());
  if (!header || header.length !== 2 || !header.includes('name') || !header.includes('desc')) {
    throw invalid('The character CSV must have the headers name,desc.');
  }
  if (rows.length === 0) throw invalid('The character CSV does not contain any characters.');
  const nameIndex = header.indexOf('name');
  const descIndex = header.indexOf('desc');
  return rows.map((row, index) => {
    if (row.length !== 2 || !row[nameIndex]?.trim()) {
      throw invalid(`Character record ${index + 1} must have two columns and a name.`);
    }
    return { name: row[nameIndex]!.trim(), description: row[descIndex]! };
  });
}
