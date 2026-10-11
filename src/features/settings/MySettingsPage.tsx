// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useEffect, useState } from 'react';
import { createDefaultUserSettings } from '@/domain/factories';
import type { UserSettings } from '@/domain/settings';
import { useBeforeUnloadGuard } from '@/app/useBeforeUnloadGuard';
import { useAutosave } from '@/shared/useAutosave';
import { toAppError } from '@/shared/errors';
import { getSettingsRepository } from '@/storage/repositories';
import { Banner } from '@/ui/Banner';
import { SavedIndicator } from '@/ui/SavedIndicator';
import { SaveErrorBanner } from '@/ui/SaveErrorBanner';
import { Spinner } from '@/ui/Spinner';
import { ApiKeyField } from './ApiKeyField';
import { ModelDropdown } from './ModelDropdown';
import { PrivacyNotice } from './PrivacyNotice';

const EMPTY_SETTINGS = createDefaultUserSettings();

export function MySettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const saveSettings = useCallback(
    (next: UserSettings) => getSettingsRepository().saveUserSettings(next),
    [],
  );
  const autosave = useAutosave(settings ?? EMPTY_SETTINGS, saveSettings, {
    enabled: settings !== null,
  });
  useBeforeUnloadGuard(autosave.status);

  const loadSettings = useCallback(async () => {
    setLoadError(null);
    try {
      setSettings(await getSettingsRepository().getUserSettings());
    } catch (error) {
      setLoadError(error);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const update = (patch: Partial<UserSettings>) => {
    setSettings((current) => (current ? { ...current, ...patch } : current));
  };

  if (loadError !== null) {
    const error = toAppError(loadError);
    return (
      <section className="surface-card" aria-labelledby="settings-heading">
        <h2 id="settings-heading">My settings</h2>
        <Banner type="error" title={error.userMessage}>
          {error.nextStep}
        </Banner>
        <button
          className="button button--secondary"
          onClick={() => void loadSettings()}
          type="button"
        >
          Try again
        </button>
      </section>
    );
  }

  if (settings === null) {
    return (
      <div aria-label="Loading settings" className="surface-card" role="status">
        <Spinner /> Loading your settings…
      </div>
    );
  }

  return (
    <section aria-labelledby="settings-heading">
      <header className="page-heading">
        <h2 id="settings-heading">My settings</h2>
        <p>Choose how Saprili will connect when picture generation becomes available.</p>
      </header>
      <div className="surface-card">
        <div className="library-toolbar">
          <SavedIndicator status={autosave.status} />
          {autosave.lastSavedAt && (
            <time dateTime={autosave.lastSavedAt}>
              Last saved {new Date(autosave.lastSavedAt).toLocaleTimeString()}
            </time>
          )}
        </div>
        {autosave.status === 'failed' && (
          <SaveErrorBanner error={autosave.error} onRetry={() => void autosave.flush()} />
        )}
        <form className="settings-form" onSubmit={(event) => event.preventDefault()}>
          <ModelDropdown onChange={(modelId) => update({ modelId })} value={settings.modelId} />
          <ApiKeyField
            onChange={(apiKey) => update({ apiKey: apiKey || null })}
            value={settings.apiKey ?? ''}
          />
          <PrivacyNotice />
        </form>
      </div>
    </section>
  );
}
