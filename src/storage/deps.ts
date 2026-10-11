// bisiyata dishmaya, leharbot ahava biyisral
import type { Clock } from '@/shared/clock';
import type { StorageProvider } from './StorageProvider';

export interface RepositoryDeps {
  /** Resolved on every call so tests can swap the provider. */
  storage: () => StorageProvider;
  clock: Clock;
}
