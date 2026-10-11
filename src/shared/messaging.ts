// bisiyata dishmaya, leharbot ahava biyisral
import type { Job, JobBatch, JobBatchState, JobPlan, JobStatus, JobStep } from '@/domain/job';

export interface JobsSnapshot {
  batches: { batch: JobBatch; jobs: Job[] }[];
}

export interface JobsErrorInfo {
  code: string;
  userMessage: string;
  nextStep: string;
}

/** Tab to job host. */
export type JobsCommand =
  | { type: 'jobs/enqueue'; plan: JobPlan }
  | { type: 'jobs/cancelBatch'; batchId: string }
  | { type: 'jobs/retryFailed'; batchId: string }
  | { type: 'jobs/getSnapshot'; bookId?: string }
  | { type: 'jobs/resume'; batchId: string };

/** Job host to tab. */
export type JobsEvent =
  | {
      type: 'jobs/progress';
      batchId: string;
      bookId: string;
      jobId: string;
      status: JobStatus;
      step: JobStep;
    }
  | {
      type: 'jobs/batchStateChanged';
      batchId: string;
      bookId: string;
      state: JobBatchState;
      pauseReason?: string;
    }
  | { type: 'jobs/fatalStop'; batchId: string; bookId: string; error: JobsErrorInfo };

export type JobsMessage = JobsCommand | JobsEvent;

export type JobsResponse =
  | { ok: true; batchId?: string; snapshot?: JobsSnapshot }
  | { ok: false; error: JobsErrorInfo };

export type JobsCommandHandler = (command: JobsCommand) => Promise<JobsResponse>;
export type JobsEventListener = (event: JobsEvent) => void;

const COMMAND_TYPES = new Set<string>([
  'jobs/enqueue',
  'jobs/cancelBatch',
  'jobs/retryFailed',
  'jobs/getSnapshot',
  'jobs/resume',
]);
const EVENT_TYPES = new Set<string>(['jobs/progress', 'jobs/batchStateChanged', 'jobs/fatalStop']);

function typeOf(value: unknown): string | null {
  return typeof value === 'object' && value !== null && 'type' in value
    ? String((value as { type: unknown }).type)
    : null;
}

export function isJobsCommand(value: unknown): value is JobsCommand {
  const type = typeOf(value);
  return type !== null && COMMAND_TYPES.has(type);
}

export function isJobsEvent(value: unknown): value is JobsEvent {
  const type = typeOf(value);
  return type !== null && EVENT_TYPES.has(type);
}

// In-tab host mode: commands and events stay inside this page.
let localHandler: JobsCommandHandler | null = null;
const localListeners = new Set<JobsEventListener>();

export function setLocalJobsHandler(handler: JobsCommandHandler | null): void {
  localHandler = handler;
}

export function emitLocalJobsEvent(event: JobsEvent): void {
  for (const listener of [...localListeners]) listener(event);
}

const hasChromeRuntime = () => typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage;

export async function sendJobsCommand(command: JobsCommand): Promise<JobsResponse> {
  if (localHandler) return localHandler(command);
  if (!hasChromeRuntime()) throw new Error('The background job host is not available');
  const response = (await chrome.runtime.sendMessage(command)) as JobsResponse | undefined;
  if (!response) throw new Error('The background job host did not answer');
  return response;
}

/** Called by the service worker; nobody listening is a normal state. */
export function broadcastJobsEvent(event: JobsEvent): void {
  if (!hasChromeRuntime()) return;
  chrome.runtime.sendMessage(event).catch(() => undefined);
}

export function subscribeJobsEvents(listener: JobsEventListener): () => void {
  localListeners.add(listener);
  const onMessage = (message: unknown) => {
    if (isJobsEvent(message)) listener(message);
    return false;
  };
  const canListen = typeof chrome !== 'undefined' && !!chrome.runtime?.onMessage;
  if (canListen) chrome.runtime.onMessage.addListener(onMessage);
  return () => {
    localListeners.delete(listener);
    if (canListen) chrome.runtime.onMessage.removeListener(onMessage);
  };
}
