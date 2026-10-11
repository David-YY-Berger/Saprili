// bisiyata dishmaya, leharbot ahava biyisral
import type { RepositoryDeps } from './deps';
import { deleteOp, putOp } from './StorageProvider';

/** Small key/value store for print jobs (`printJob:<id>`) and flags. */
export interface MetaRepository {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export function createMetaRepository({ storage }: RepositoryDeps): MetaRepository {
  return {
    async get<T>(key: string) {
      return (await storage().get('meta', key))?.value as T | undefined;
    },
    set: (key, value) => storage().apply([putOp('meta', { key, value })]),
    delete: (key) => storage().apply([deleteOp('meta', key)]),
  };
}
