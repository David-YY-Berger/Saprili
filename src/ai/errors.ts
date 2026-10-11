// bisiyata dishmaya, leharbot ahava biyisral
import { AppError } from '@/shared/errors';

interface GeminiErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export function mapProviderError(
  status: number,
  payload: GeminiErrorResponse | null,
): AppError {
  const message = payload?.error?.message?.toLowerCase() ?? '';
  const statusText = payload?.error?.status?.toLowerCase() ?? '';
  if (status === 401 || status === 403) return new AppError('AI_AUTH');
  if (status === 429 || message.includes('quota') || statusText.includes('resource_exhausted')) {
    return new AppError('AI_QUOTA');
  }
  if (
    message.includes('safety') ||
    message.includes('blocked') ||
    message.includes('prohibited') ||
    statusText.includes('safety')
  ) {
    return new AppError('AI_REFUSED');
  }
  if (status >= 500 || status === 408) return new AppError('AI_TEMPORARY');
  return new AppError('AI_BAD_RESPONSE');
}
