// bisiyata dishmaya, leharbot ahava biyisral
import { DEFAULT_GUTTER_MM } from '@/domain/constants';
import { findMentionedCharacterIds } from '@/domain/characters';
import type { Character } from '@/domain/page';
import { isRecord, type MigrationRegistry } from './runner';

// Version 0 is the pre-release prototype shape: no schemaVersion, `layout.innerMarginMm`
// instead of `gutterMm`, and no `print`, `lastBackupAt`, or image `meta`.

export const bookMigrations: MigrationRegistry = {
  0: (record) => {
    const { innerMarginMm, ...layout } = isRecord(record.layout) ? record.layout : {};
    return {
      ...record,
      layout: { ...layout, gutterMm: layout.gutterMm ?? innerMarginMm ?? DEFAULT_GUTTER_MM },
      print: record.print ?? { sheetMode: 'exact' },
      lastBackupAt: record.lastBackupAt ?? null,
    };
  },
  1: (record) => ({ ...record }),
  // Version 3 adds intro.characters.
  2: (record) => ({
    ...record,
    intro: isRecord(record.intro)
      ? { ...record.intro, characters: record.intro.characters ?? [] }
      : record.intro,
  }),
  3: (record) => ({
    ...record,
    cover: isRecord(record.cover)
      ? {
          ...record.cover,
          artworkMode: record.cover.artworkMode ?? 'single',
          characterPortraits: record.cover.characterPortraits ?? [],
        }
      : record.cover,
  }),
  4: (record) => ({
    ...record,
    cover: isRecord(record.cover)
      ? {
          ...record.cover,
          back: {
            note: '',
            artworkMode: 'generate',
            referenceImageId: null,
            generatedImageId: null,
            ownImageId: null,
            ...(isRecord(record.cover.back) ? record.cover.back : {}),
          },
        }
      : record.cover,
  }),
  // Version 6 moves characters from the intro to the book and adds per-page and cover selections.
  5: (record) => {
    const intro = isRecord(record.intro) ? record.intro : {};
    const { characters: introCharacters, ...introRest } = intro;
    const characters = Array.isArray(introCharacters) ? introCharacters : [];
    const cover = isRecord(record.cover) ? record.cover : {};
    const portraits = Array.isArray(cover.characterPortraits) ? cover.characterPortraits : [];
    return {
      ...record,
      characters: record.characters ?? characters,
      intro: introRest,
      storyPages: Array.isArray(record.storyPages)
        ? record.storyPages.map((page: unknown) =>
            isRecord(page)
              ? {
                  ...page,
                  characterIds:
                    page.characterIds ??
                    findMentionedCharacterIds(
                      characters.filter(isRecord) as unknown as Character[],
                      typeof page.textEn === 'string' ? page.textEn : '',
                    ),
                }
              : page,
          )
        : record.storyPages,
      cover: {
        ...cover,
        characterIds:
          cover.characterIds ??
          portraits.filter(isRecord).map((portrait) => portrait.characterId),
      },
    };
  },
};

export const imageMigrations: MigrationRegistry = {
  0: (record) => ({ ...record, meta: record.meta ?? { source: 'uploaded' } }),
  1: (record) => ({ ...record }),
  2: (record) => ({ ...record }),
  3: (record) => ({ ...record }),
  4: (record) => ({ ...record }),
  5: (record) => ({ ...record }),
};

export const settingsMigrations: MigrationRegistry = {
  0: (record) => ({
    ...record,
    illustrationModelId: 'gemini-3-pro-image',
    colouringModelId: 'gemini-3.1-flash-lite-image',
    apiKey: record.apiKey ?? null,
  }),
  1: (record) => ({
    ...record,
    illustrationModelId: record.illustrationModelId ?? 'gemini-3-pro-image',
    colouringModelId: record.colouringModelId ?? 'gemini-3.1-flash-lite-image',
    apiKey: record.apiKey ?? null,
  }),
  2: (record) => ({ ...record }),
  3: (record) => ({ ...record }),
  4: (record) => ({ ...record }),
  5: (record) => ({ ...record }),
};
