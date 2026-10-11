// bisiyata dishmaya, leharbot ahava biyisral
import { emitLocalJobsEvent, setLocalJobsHandler } from '@/shared/messaging';
import { createJobHost, type JobHost } from './JobHost';
import { noKeepAlive } from './KeepAlive';
import { createRealJobHostDeps } from './realDeps';

let started: Promise<JobHost> | null = null;

/** Fallback host: the same queue and runner, living in the open app tab. */
export function startInTabJobHost(): Promise<JobHost> {
  started ??= (async () => {
    const host = createJobHost(createRealJobHostDeps(emitLocalJobsEvent, noKeepAlive));
    setLocalJobsHandler((command) => host.handle(command));
    // A closed tab stopped the old runner, so unfinished batches wait for the user.
    await host.resume('pause');
    return host;
  })();
  return started;
}
