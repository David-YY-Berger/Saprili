// bisiyata dishmaya, leharbot ahava biyisral
import { getImageModel } from '@/ai/modelCatalog';
import type { ImageProvider } from '@/ai/ImageProvider';
import { AppError } from '@/shared/errors';
import { GeminiImageProvider } from './GeminiImageProvider';
import { MockImageProvider } from './MockImageProvider';

export type ProviderMode = 'gemini' | 'mock';

export function createProvider(
  modelId: string,
  apiKey: string,
  mode: ProviderMode = __SAPRILI_PROVIDER__,
): ImageProvider {
  if (!getImageModel(modelId)) throw new AppError('AI_UNSUPPORTED_MODEL');
  if (mode === 'mock') return new MockImageProvider(modelId, null, __SAPRILI_MOCK_DELAY_MS__);
  if (mode === 'gemini') return new GeminiImageProvider(modelId, apiKey);
  throw new AppError('AI_UNSUPPORTED_MODEL');
}
