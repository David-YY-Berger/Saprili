// bisiyata dishmaya, leharbot ahava biyisral
import { openDB, type IDBPDatabase } from 'idb';
import { toAppError } from '@/shared/errors';
import { DB_NAME, DB_VERSION, STORE_DEFS } from './idbSchema';
import type {
  StorageProvider,
  StoreIndexName,
  StoreName,
  StoreOp,
  StoreValueMap,
} from './StorageProvider';

export class IdbStorageProvider implements StorageProvider {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  constructor(private readonly dbName: string = DB_NAME) {}

  private open(): Promise<IDBPDatabase> {
    this.dbPromise ??= openDB(this.dbName, DB_VERSION, {
      upgrade(db) {
        for (const [name, def] of Object.entries(STORE_DEFS)) {
          if (db.objectStoreNames.contains(name)) continue;
          const store = db.createObjectStore(name, { keyPath: def.keyPath });
          for (const index of def.indexes) store.createIndex(index, index);
        }
      },
      terminated: () => {
        this.dbPromise = null;
      },
    });
    this.dbPromise.catch(() => {
      this.dbPromise = null;
    });
    return this.dbPromise;
  }

  private async run<T>(work: (db: IDBPDatabase) => Promise<T>): Promise<T> {
    try {
      return await work(await this.open());
    } catch (error) {
      throw toAppError(error);
    }
  }

  get<S extends StoreName>(store: S, key: string): Promise<StoreValueMap[S] | undefined> {
    return this.run((db) => db.get(store, key));
  }

  getAll<S extends StoreName>(store: S): Promise<StoreValueMap[S][]> {
    return this.run((db) => db.getAll(store));
  }

  getAllByIndex<S extends StoreName>(
    store: S,
    index: StoreIndexName,
    value: string,
  ): Promise<StoreValueMap[S][]> {
    return this.run((db) => db.getAllFromIndex(store, index, value));
  }

  getAllKeysByIndex(store: StoreName, index: StoreIndexName, value: string): Promise<string[]> {
    return this.run(async (db) => (await db.getAllKeysFromIndex(store, index, value)).map(String));
  }

  apply(ops: readonly StoreOp[]): Promise<void> {
    if (ops.length === 0) return Promise.resolve();
    return this.run(async (db) => {
      const stores = [...new Set(ops.map((op) => op.store))];
      const tx = db.transaction(stores, 'readwrite');
      const pending: Promise<unknown>[] = [tx.done];
      try {
        for (const op of ops) {
          const store = tx.objectStore(op.store);
          pending.push(op.type === 'put' ? store.put(op.value) : store.delete(op.key));
        }
        await Promise.all(pending);
      } catch (error) {
        // A synchronous failure would otherwise let earlier writes commit.
        for (const p of pending) p.catch(() => {});
        try {
          tx.abort();
        } catch {
          // already finished or aborted
        }
        throw error;
      }
    });
  }
}
