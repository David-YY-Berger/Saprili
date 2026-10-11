// bisiyata dishmaya, leharbot ahava biyisral
import { createProvider } from '@/ai/providers';
import { systemClock } from '@/shared/clock';
import type { JobsEvent } from '@/shared/messaging';
import {
  bookRepository,
  getSettingsRepository,
  imageRepository,
  jobRepository,
} from '@/storage/repositories';
import type { JobHostDeps } from './JobHost';
import type { KeepAliveLike } from './KeepAlive';

export function createRealJobHostDeps(
  emit: (event: JobsEvent) => void,
  keepAlive: KeepAliveLike,
): JobHostDeps {
  return {
    jobRepository,
    bookRepository,
    imageRepository,
    settingsRepository: getSettingsRepository(),
    providerFactory: createProvider,
    clock: systemClock,
    keepAlive,
    emit,
  };
}
