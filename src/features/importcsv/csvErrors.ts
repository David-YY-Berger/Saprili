// bisiyata dishmaya, leharbot ahava biyisral
import { AppError, type ErrorCode } from '@/shared/errors';

export interface CsvIssue {
  code: ErrorCode;
  rows: number[];
}

export interface CsvValidationResult {
  valid: boolean;
  issues: CsvIssue[];
}

export function createCsvError(issue: CsvIssue): AppError {
  return new AppError(issue.code, {
    detail: issue.rows.length > 0 ? `CSV rows ${issue.rows.join(', ')}` : undefined,
  });
}
