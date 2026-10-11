// bisiyata dishmaya, leharbot ahava biyisral
import type { AppError, ErrorCode } from '@/shared/errors';

export const MAX_JOB_ATTEMPTS = 3;
const FATAL_CODES: readonly ErrorCode[] = ['AI_AUTH', 'AI_QUOTA', 'AI_NO_KEY'];
const BASE_BACKOFF_MS = 2000;

/** These stop the whole batch: retrying the next job would fail the same way. */
export function isFatalStop(error: AppError): boolean {
  return FATAL_CODES.includes(error.code);
}

/** `attempts` is how many calls this job has already made, including the failed one. */
export function shouldRetry(error: AppError, attempts: number): boolean {
  return error.code === 'AI_TEMPORARY' && attempts < MAX_JOB_ATTEMPTS;
}

export function backoffMs(attempts: number): number {
  return BASE_BACKOFF_MS * 4 ** Math.max(0, attempts - 1);
}
