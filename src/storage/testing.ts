// bisiyata dishmaya, leharbot ahava biyisral
import 'fake-indexeddb/auto';
import { IdbStorageProvider } from './IdbStorageProvider';

let counter = 0;

/** A fresh, isolated in-memory database for each test. */
export function createTestStorage(): IdbStorageProvider {
  counter += 1;
  return new IdbStorageProvider(`saprili-test-${counter}`);
}
