// bisiyata dishmaya, leharbot ahava biyisral
import type { JobPlan } from '@/domain/job';
import { startInTabJobHost } from '@/background/jobs/InTabJobHost';
import { getJobHostMode } from '@/background/jobs/hostMode';
import { AppError, ERROR_CODES, type ErrorCode } from '@/shared/errors';
import {
  sendJobsCommand,
  subscribeJobsEvents,
  type JobsCommand,
  type JobsEventListener,
  type JobsSnapshot,
} from '@/shared/messaging';
import { metaRepository } from '@/storage/repositories';

let ready: Promise<void> | null = null;

/** Starts the in-tab host when the fallback mode is selected; the worker host needs nothing. */
function ensureReady(): Promise<void> {
  ready ??= (async () => {
    if ((await getJobHostMode(metaRepository)) === 'tab') await startInTabJobHost();
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function send(command: JobsCommand) {
  await ensureReady();
  const response = await sendJobsCommand(command);
  if (response.ok) return response;
  const { code, userMessage, nextStep } = response.error;
  const known = (ERROR_CODES as readonly string[]).includes(code) ? (code as ErrorCode) : 'STORAGE_FAILED';
  throw new AppError(known, { userMessage, nextStep });
}

/** What the tab uses to talk to whichever host runs the queue. */
export const JobsClient = {
  async enqueueBatch(plan: JobPlan): Promise<string> {
    const response = await send({ type: 'jobs/enqueue', plan });
    return response.batchId ?? '';
  },
  async cancelBatch(batchId: string): Promise<void> {
    await send({ type: 'jobs/cancelBatch', batchId });
  },
  async retryFailed(batchId: string): Promise<void> {
    await send({ type: 'jobs/retryFailed', batchId });
  },
  async resume(batchId: string): Promise<void> {
    await send({ type: 'jobs/resume', batchId });
  },
  async getSnapshot(bookId?: string): Promise<JobsSnapshot> {
    const response = await send({ type: 'jobs/getSnapshot', bookId });
    return response.snapshot ?? { batches: [] };
  },
  subscribe(listener: JobsEventListener): () => void {
    void ensureReady().catch(() => undefined);
    return subscribeJobsEvents(listener);
  },
};
