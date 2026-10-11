// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { createDefaultUserSettings, createEmptyBook } from '@/domain/factories';
import { AppError } from '@/shared/errors';
import { CURRENT_SCHEMA_VERSION, migrateBookRecord, migrateImageRecord, migrateSettings } from '.';

const v0Book = {
  id: 'old',
  title: 'old book',
  createdAt: '2025-01-01T00:00:00.000Z',
  modifiedAt: '2025-01-02T00:00:00.000Z',
  layout: { marginTopMm: 10, marginBottomMm: 10, marginOuterMm: 10, innerMarginMm: 18 },
  intro: { id: 'i' },
  storyPages: [],
};

describe('migrations', () => {
  it('upgrades a version 0 book without mutating the input', () => {
    const snapshot = structuredClone(v0Book);
    const book = migrateBookRecord(v0Book);
    expect(book.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(book.layout.gutterMm).toBe(18);
    expect('innerMarginMm' in book.layout).toBe(false);
    expect(book.print).toEqual({ sheetMode: 'exact' });
    expect(book.lastBackupAt).toBeNull();
    expect(v0Book).toEqual(snapshot);
  });

  it('leaves a current book unchanged', () => {
    const book = createEmptyBook({ id: 'b', nowIso: '2026-01-01T00:00:00.000Z' });
    expect(migrateBookRecord(book)).toEqual(book);
  });

  it('upgrades image and settings records', () => {
    const image = migrateImageRecord({ id: 'x', blob: new Blob(['a']) });
    expect(image.meta).toEqual({ source: 'uploaded' });
    expect(migrateSettings({ apiKey: 'k' })).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      apiKey: 'k',
      modelId: null,
    });
    expect(migrateSettings(createDefaultUserSettings())).toEqual(createDefaultUserSettings());
  });

  it('rejects newer or malformed records', () => {
    expect(() => migrateBookRecord({ ...v0Book, schemaVersion: 99 })).toThrow(AppError);
    expect(() => migrateBookRecord('nope')).toThrow(AppError);
    expect(() => migrateBookRecord({ schemaVersion: 1 })).toThrow(AppError);
  });
});
