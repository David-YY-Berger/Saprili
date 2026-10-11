// bisiyata dishmaya, leharbot ahava biyisral
import { useMemo, useState } from 'react';
import type { Book } from '@/domain/book';
import { requestGeminiPermission } from '@/ai/geminiPermission';
import { AppError, toAppError } from '@/shared/errors';
import { getSettingsRepository } from '@/storage/repositories';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { BatchProgress } from './BatchProgress';
import { GeneratePageList } from './GeneratePageList';
import { JobSwitches } from './JobSwitches';
import { JobsClient } from './JobsClient';
import { PlanSummary } from './PlanSummary';
import { SelectionShortcuts } from './SelectionShortcuts';
import {
  buildJobPlan,
  DEFAULT_SWITCHES,
  selectMissingIllustration,
  type GenerateSelection,
  type JobSwitches as Switches,
} from './jobPlan';
import { isActiveBatch, type BookJobsState } from './useBookJobs';

export function GenerateDialog({
  book,
  open,
  jobsState,
  onClose,
}: {
  book: Book;
  open: boolean;
  jobsState: BookJobsState;
  onClose: () => void;
}) {
  const { batch, jobs, refresh } = jobsState;
  const [selection, setSelection] = useState<GenerateSelection>(() =>
    selectMissingIllustration(book),
  );
  const [switches, setSwitches] = useState<Switches>(DEFAULT_SWITCHES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const active = isActiveBatch(batch);
  const plan = useMemo(() => buildJobPlan(book, selection, switches), [book, selection, switches]);

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      await refresh();
    } catch (caught) {
      setError(toAppError(caught));
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      const settings = await getSettingsRepository().getUserSettings();
      if (!settings.apiKey?.trim()) throw new AppError('AI_NO_KEY');
      // Asked here, while the user's click is still fresh; the worker cannot ask.
      if (__SAPRILI_PROVIDER__ !== 'mock') await requestGeminiPermission();
      await JobsClient.enqueueBatch(plan);
    });

  const toggle = (pageId: string | null, selected: boolean) =>
    setSelection((current) => {
      if (pageId === null) return { ...current, cover: selected };
      const pageIds = new Set(current.pageIds);
      if (selected) pageIds.add(pageId);
      else pageIds.delete(pageId);
      return { ...current, pageIds };
    });

  return (
    <Modal onClose={onClose} open={open} title="Generate">
      {error && (
        <Banner type="error" title={error.userMessage}>
          {error.nextStep}
        </Banner>
      )}
      {batch && (
        <BatchProgress
          batch={batch}
          busy={busy}
          jobs={jobs}
          onCancel={() => void run(() => JobsClient.cancelBatch(batch.id))}
          onResume={() => void run(() => JobsClient.resume(batch.id))}
          onRetryFailed={() => void run(() => JobsClient.retryFailed(batch.id))}
        />
      )}
      {!active && (
        <>
          <SelectionShortcuts book={book} disabled={busy} onSelect={setSelection} />
          <JobSwitches disabled={busy} onChange={setSwitches} value={switches} />
        </>
      )}
      <GeneratePageList
        book={book}
        disabled={busy || active}
        jobs={jobs}
        onToggle={toggle}
        plan={plan}
        selection={selection}
        switches={switches}
      />
      {!active && <PlanSummary plan={plan} />}
      <div className="modal__actions">
        <Button onClick={onClose} variant="secondary">
          Close
        </Button>
        {!active && (
          <Button disabled={busy || plan.jobs.length === 0} onClick={() => void start()}>
            Start generating
          </Button>
        )}
      </div>
    </Modal>
  );
}
