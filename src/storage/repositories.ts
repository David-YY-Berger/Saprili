// bisiyata dishmaya, leharbot ahava biyisral
import { systemClock } from '@/shared/clock';
import { createBookRepository } from './bookRepository';
import type { RepositoryDeps } from './deps';
import { IdbStorageProvider } from './IdbStorageProvider';
import { createImageRepository } from './imageRepository';
import { createJobRepository } from './jobRepository';
import { createMetaRepository } from './metaRepository';
import { ChromeSettingsRepository, type SettingsRepository } from './settingsStore';
import type { StorageProvider } from './StorageProvider';

export type { BookRepository, SaveReason } from './bookRepository';
export type { ImageRepository } from './imageRepository';
export type { JobRepository } from './jobRepository';
export type { MetaRepository } from './metaRepository';
export type { SettingsRepository } from './settingsStore';

let storage: StorageProvider | null = null;
let settings: SettingsRepository | null = null;

export function getStorage(): StorageProvider {
  storage ??= new IdbStorageProvider();
  return storage;
}

/** Pass null to go back to the real provider. */
export function setStorageForTests(provider: StorageProvider | null): void {
  storage = provider;
}

export function getSettingsRepository(): SettingsRepository {
  settings ??= new ChromeSettingsRepository();
  return settings;
}

export function setSettingsRepositoryForTests(repository: SettingsRepository | null): void {
  settings = repository;
}

const deps: RepositoryDeps = { storage: getStorage, clock: systemClock };

export const bookRepository = createBookRepository(deps);
export const imageRepository = createImageRepository(deps);
export const jobRepository = createJobRepository(deps);
export const metaRepository = createMetaRepository(deps);
