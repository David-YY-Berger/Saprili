// bisiyata dishmaya, leharbot ahava biyisral
import type { Job, JobBatch } from '@/domain/job';
import type { ThumbRecord } from '@/domain/image';

export type StoreName = 'books' | 'images' | 'thumbs' | 'jobs' | 'batches' | 'meta';
export type StoreIndexName = 'bookId' | 'batchId';

/** A stored record that has not been through migration yet. */
export type RawRecord = object;

export interface MetaEntry {
  key: string;
  value: unknown;
}

export interface StoreValueMap {
  books: RawRecord;
  images: RawRecord;
  thumbs: ThumbRecord;
  jobs: Job;
  batches: JobBatch;
  meta: MetaEntry;
}

export type StoreOp = {
  [S in StoreName]:
    { type: 'put'; store: S; value: StoreValueMap[S] } | { type: 'delete'; store: S; key: string };
}[StoreName];

export const putOp = <S extends StoreName>(store: S, value: StoreValueMap[S]): StoreOp =>
  ({ type: 'put', store, value }) as StoreOp;

export const deleteOp = (store: StoreName, key: string): StoreOp =>
  ({ type: 'delete', store, key }) as StoreOp;

/**
 * The single persistence port. Repositories build on it; nothing else may
 * touch the backend. `apply` runs all operations in one atomic transaction.
 */
export interface StorageProvider {
  get<S extends StoreName>(store: S, key: string): Promise<StoreValueMap[S] | undefined>;
  getAll<S extends StoreName>(store: S): Promise<StoreValueMap[S][]>;
  getAllByIndex<S extends StoreName>(
    store: S,
    index: StoreIndexName,
    value: string,
  ): Promise<StoreValueMap[S][]>;
  getAllKeysByIndex(store: StoreName, index: StoreIndexName, value: string): Promise<string[]>;
  apply(ops: readonly StoreOp[]): Promise<void>;
}
