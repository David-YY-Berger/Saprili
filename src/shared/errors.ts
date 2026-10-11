// bisiyata dishmaya, leharbot ahava biyisral
import { t } from '@/i18n';

export const ERROR_CODES = [
  'STORAGE_FAILED',
  'STORAGE_QUOTA',
  'MIGRATION_FAILED',
  'CSV_BAD_COLUMNS',
  'CSV_ODD_ROWS',
  'CSV_EMPTY_ROWS',
  'CSV_BAD_ENCODING',
  'IMAGE_DECODE_FAILED',
  'IMAGE_TOO_LARGE',
  'AI_NO_KEY',
  'AI_AUTH',
  'AI_QUOTA',
  'AI_REFUSED',
  'AI_TEMPORARY',
  'AI_BAD_RESPONSE',
  'AI_UNSUPPORTED_MODEL',
  'JOB_INTERRUPTED',
  'BACKUP_INVALID',
  'BACKUP_TOO_NEW',
  'PRINT_ASSET_FAILED',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface AppErrorOptions {
  /** Overrides the catalogue message. */
  userMessage?: string;
  /** Overrides the catalogue next step. */
  nextStep?: string;
  cause?: unknown;
  /** Developer-only detail; never shown to users. */
  detail?: string;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly nextStep: string;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    const userMessage = options.userMessage ?? t(`errors.${code}.message`);
    super(
      `${code}: ${options.detail ?? userMessage}`,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.nextStep = options.nextStep ?? t(`errors.${code}.next`);
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: unknown }).name === 'QuotaExceededError'
  );
}

export function toAppError(error: unknown, fallback: ErrorCode = 'STORAGE_FAILED'): AppError {
  if (error instanceof AppError) return error;
  if (isQuotaError(error)) return new AppError('STORAGE_QUOTA', { cause: error });
  return new AppError(fallback, {
    cause: error,
    detail: error instanceof Error ? error.message : undefined,
  });
}
