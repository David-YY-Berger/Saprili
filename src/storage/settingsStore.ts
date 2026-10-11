// bisiyata dishmaya, leharbot ahava biyisral
import { createDefaultUserSettings } from '@/domain/factories';
import { CURRENT_SCHEMA_VERSION } from '@/domain/constants';
import type { UserSettings } from '@/domain/settings';
import { toAppError } from '@/shared/errors';
import { migrateSettings } from './migrations';

export interface SettingsRepository {
  getUserSettings(): Promise<UserSettings>;
  saveUserSettings(settings: UserSettings): Promise<void>;
}

export const USER_SETTINGS_KEY = 'userSettings';

type StorageArea = Pick<chrome.storage.StorageArea, 'get' | 'set'>;

export class ChromeSettingsRepository implements SettingsRepository {
  constructor(private readonly area: () => StorageArea = () => chrome.storage.local) {}

  async getUserSettings(): Promise<UserSettings> {
    try {
      const stored = (await this.area().get(USER_SETTINGS_KEY))[USER_SETTINGS_KEY];
      return stored === undefined ? createDefaultUserSettings() : migrateSettings(stored);
    } catch (error) {
      throw toAppError(error);
    }
  }

  async saveUserSettings(settings: UserSettings): Promise<void> {
    try {
      await this.area().set({
        [USER_SETTINGS_KEY]: { ...settings, schemaVersion: CURRENT_SCHEMA_VERSION },
      });
    } catch (error) {
      throw toAppError(error);
    }
  }
}

/** Test double that keeps settings in memory. */
export class InMemorySettingsRepository implements SettingsRepository {
  private stored: UserSettings | undefined;

  async getUserSettings(): Promise<UserSettings> {
    return this.stored ? { ...this.stored } : createDefaultUserSettings();
  }

  async saveUserSettings(settings: UserSettings): Promise<void> {
    this.stored = { ...settings, schemaVersion: CURRENT_SCHEMA_VERSION };
  }
}
