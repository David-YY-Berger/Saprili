// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import { getJobHostMode, setJobHostMode, type JobHostMode } from '@/background/jobs/hostMode';
import { toAppError, type AppError } from '@/shared/errors';
import { metaRepository } from '@/storage/repositories';
import { Banner } from '@/ui/Banner';

export function JobHostModeField() {
  const [mode, setMode] = useState<JobHostMode | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    getJobHostMode(metaRepository).then(setMode, (caught) => setError(toAppError(caught)));
  }, []);

  const update = async (inTab: boolean) => {
    const next: JobHostMode = inTab ? 'tab' : 'background';
    try {
      await setJobHostMode(metaRepository, next);
      setMode(next);
      setChanged(true);
      setError(null);
    } catch (caught) {
      setError(toAppError(caught));
    }
  };

  return (
    <fieldset className="settings-advanced">
      <legend>Advanced</legend>
      <label>
        <input
          checked={mode === 'tab'}
          disabled={mode === null}
          onChange={(event) => void update(event.target.checked)}
          type="checkbox"
        />{' '}
        Run generation inside this tab instead of in the background
      </label>
      <p>
        Use this only if background generation stops unexpectedly. Jobs then pause when the tab
        closes.
      </p>
      {changed && <Banner type="info">Close and reopen Saprili for this to take effect.</Banner>}
      {error && (
        <Banner type="error" title={error.userMessage}>
          {error.nextStep}
        </Banner>
      )}
    </fieldset>
  );
}
