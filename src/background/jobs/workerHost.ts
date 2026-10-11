// bisiyata dishmaya, leharbot ahava biyisral
import { broadcastJobsEvent, isJobsCommand } from '@/shared/messaging';
import { metaRepository } from '@/storage/repositories';
import { claimSessionFlag } from '@/storage/sessionFlag';
import { createJobHost, type JobHost } from './JobHost';
import { getJobHostMode } from './hostMode';
import { KeepAlive } from './KeepAlive';
import { createRealJobHostDeps } from './realDeps';

const SESSION_FLAG = 'saprili.jobHostAlive';

let hostPromise: Promise<JobHost | null> | null = null;

async function startHost(): Promise<JobHost | null> {
  if ((await getJobHostMode(metaRepository)) !== 'background') return null;
  const host = createJobHost(createRealJobHostDeps(broadcastJobsEvent, new KeepAlive()));
  // Session storage survives an idle worker restart but not a browser or extension restart.
  const flag = await claimSessionFlag(SESSION_FLAG);
  await host.resume(flag ? 'continue' : 'pause');
  return host;
}

/** Starts the host once per worker run. Safe to call from any startup event. */
export function ensureJobHost(): Promise<JobHost | null> {
  hostPromise ??= startHost().catch((error) => {
    console.error(error);
    hostPromise = null;
    return null;
  });
  return hostPromise;
}

// Listeners are registered synchronously; Chrome wakes the worker for these events.
export function registerJobsHost(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isJobsCommand(message)) return false;
    void ensureJobHost().then(async (host) => {
      if (!host) {
        sendResponse({
          ok: false,
          error: {
            code: 'JOB_HOST_UNAVAILABLE',
            userMessage: 'Background generation is switched off.',
            nextStep: 'Reopen Saprili to run generation inside the tab.',
          },
        });
        return;
      }
      sendResponse(await host.handle(message));
    });
    return true;
  });
  chrome.runtime.onStartup.addListener(() => void ensureJobHost());
  chrome.runtime.onInstalled.addListener(() => void ensureJobHost());
  void ensureJobHost();
}
