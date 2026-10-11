// bisiyata dishmaya, leharbot ahava biyisral
import { DEFAULT_GUTTER_MM } from '@/domain/constants';
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
};

export const imageMigrations: MigrationRegistry = {
  0: (record) => ({ ...record, meta: record.meta ?? { source: 'uploaded' } }),
};

export const settingsMigrations: MigrationRegistry = {
  0: (record) => ({ ...record, modelId: record.modelId ?? null, apiKey: record.apiKey ?? null }),
};
