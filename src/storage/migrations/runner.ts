// bisiyata dishmaya, leharbot ahava biyisral
import { AppError } from '@/shared/errors';

export type MigrationRecord = Record<string, unknown>;
/** Must return a new object and never mutate its input. */
export type MigrationStep = (record: MigrationRecord) => MigrationRecord;
/** Keyed by the version a step upgrades FROM. */
export type MigrationRegistry = Readonly<Record<number, MigrationStep>>;

export const isRecord = (value: unknown): value is MigrationRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function runMigrations(
  raw: unknown,
  registry: MigrationRegistry,
  target: number,
  what: string,
): MigrationRecord {
  if (!isRecord(raw)) {
    throw new AppError('MIGRATION_FAILED', { detail: `${what} record is not an object` });
  }
  let version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (version > target) {
    throw new AppError('MIGRATION_FAILED', {
      detail: `${what} has schema version ${version}, newer than supported ${target}`,
    });
  }
  let record = raw;
  while (version < target) {
    const step = registry[version];
    if (!step) {
      throw new AppError('MIGRATION_FAILED', {
        detail: `No migration for ${what} from version ${version}`,
      });
    }
    try {
      record = { ...step(record), schemaVersion: version + 1 };
    } catch (cause) {
      throw new AppError('MIGRATION_FAILED', { cause, detail: `${what} from version ${version}` });
    }
    version += 1;
  }
  return record;
}
