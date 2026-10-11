// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { CURRENT_SCHEMA_VERSION } from '@/domain/constants';
import type { ImageRecord } from '@/domain/image';
import type { UserSettings } from '@/domain/settings';
import { AppError } from '@/shared/errors';
import { runMigrations, type MigrationRegistry } from './runner';
import { bookMigrations, imageMigrations, settingsMigrations } from './steps';

export { CURRENT_SCHEMA_VERSION };

export const MIGRATION_REGISTRY = {
  book: bookMigrations,
  image: imageMigrations,
  settings: settingsMigrations,
} satisfies Record<string, MigrationRegistry>;

export function migrateBookRecord(raw: unknown): Book {
  const record = runMigrations(raw, bookMigrations, CURRENT_SCHEMA_VERSION, 'book');
  if (typeof record.id !== 'string' || !Array.isArray(record.storyPages) || !record.intro) {
    throw new AppError('MIGRATION_FAILED', { detail: 'book record is missing required fields' });
  }
  return record as unknown as Book;
}

export function migrateImageRecord(raw: unknown): ImageRecord {
  const record = runMigrations(raw, imageMigrations, CURRENT_SCHEMA_VERSION, 'image');
  if (typeof record.id !== 'string' || !(record.blob instanceof Blob)) {
    throw new AppError('MIGRATION_FAILED', { detail: 'image record is missing required fields' });
  }
  return record as unknown as ImageRecord;
}

export function migrateSettings(raw: unknown): UserSettings {
  return runMigrations(
    raw,
    settingsMigrations,
    CURRENT_SCHEMA_VERSION,
    'settings',
  ) as unknown as UserSettings;
}
