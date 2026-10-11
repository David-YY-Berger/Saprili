// bisiyata dishmaya, leharbot ahava biyisral
import type { StoreIndexName, StoreName } from './StorageProvider';

export const DB_NAME = 'saprili';
/** IndexedDB structure version; unrelated to the data schema version. */
export const DB_VERSION = 1;

export interface StoreDef {
  keyPath: string;
  indexes: readonly StoreIndexName[];
}

export const STORE_DEFS: Record<StoreName, StoreDef> = {
  books: { keyPath: 'id', indexes: [] },
  images: { keyPath: 'id', indexes: ['bookId'] },
  thumbs: { keyPath: 'imageId', indexes: ['bookId'] },
  jobs: { keyPath: 'id', indexes: ['bookId', 'batchId'] },
  batches: { keyPath: 'id', indexes: ['bookId'] },
  meta: { keyPath: 'key', indexes: [] },
};
