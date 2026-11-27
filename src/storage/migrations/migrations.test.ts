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

  it('migrates existing intros to special mode with empty story artwork', () => {
    const book = createEmptyBook({ id: 'old', nowIso: '2026-01-01T00:00:00.000Z' });
    const { mode, characterIds, illustration, colouring, ...oldIntro } = book.intro;
    expect(mode).toBe('special');
    const migrated = migrateBookRecord({ ...book, schemaVersion: 6, intro: oldIntro });
    expect(migrated.intro).toMatchObject({ ...oldIntro, mode, characterIds, illustration, colouring });
  });

  it('adds default cover artwork fields when upgrading version 3 books', () => {
    const book = createEmptyBook({ id: 'old-cover', nowIso: '2026-01-01T00:00:00.000Z' });
    book.schemaVersion = 3;
    delete (book.cover as Partial<typeof book.cover>).artworkMode;
    delete (book.cover as Partial<typeof book.cover>).characterPortraits;
    const migrated = migrateBookRecord(book);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.cover.artworkMode).toBe('single');
    expect(migrated.cover.characterPortraits).toEqual([]);
    expect(migrated.cover.back).toEqual({
      note: '',
      artworkMode: 'generate',
      referenceImageIds: [],
      customPrompt: '',
      generatedImageId: null,
      ownImageId: null,
    });
  });

  it('preserves a version 7 back-cover reference when upgrading to multiple photos', () => {
    const book = createEmptyBook({ id: 'old-back', nowIso: '2026-01-01T00:00:00.000Z' });
    const { referenceImageIds, customPrompt, ...back } = book.cover.back;
    expect(referenceImageIds).toEqual([]);
    expect(customPrompt).toBe('');
    const old = {
      ...book,
      schemaVersion: 7,
      cover: { ...book.cover, back: { ...back, referenceImageId: 'original' } },
    };
    const migrated = migrateBookRecord(old);
    expect(migrated.cover.back.referenceImageIds).toEqual(['original']);
    expect(migrated.cover.back.customPrompt).toBe('');
    expect(old.cover.back.referenceImageId).toBe('original');
    expect(migrateBookRecord({
      ...old,
      cover: { ...old.cover, back: { ...old.cover.back, referenceImageId: null } },
    }).cover.back.referenceImageIds).toEqual([]);
  });

  it('upgrades image and settings records', () => {
    const image = migrateImageRecord({ id: 'x', blob: new Blob(['a']) });
    expect(image.meta).toEqual({ source: 'uploaded' });
    expect(migrateSettings({ apiKey: 'k' })).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      apiKey: 'k',
      illustrationModelId: 'gemini-3-pro-image',
      colouringModelId: 'gemini-3.1-flash-lite-image',
    });
    expect(migrateSettings(createDefaultUserSettings())).toEqual(createDefaultUserSettings());
  });

  it('rejects newer or malformed records', () => {
    expect(() => migrateBookRecord({ ...v0Book, schemaVersion: 99 })).toThrow(AppError);
    expect(() => migrateBookRecord('nope')).toThrow(AppError);
    expect(() => migrateBookRecord({ schemaVersion: 1 })).toThrow(AppError);
  });
});
