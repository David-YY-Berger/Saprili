// bisiyata dishmaya, leharbot ahava biyisral
import type { MetaRepository } from '@/storage/metaRepository';

export type JobHostMode = 'background' | 'tab';

/** `'background'` runs the queue in the service worker; `'tab'` runs it inside the open app tab. */
export const JOB_HOST_MODE_KEY = 'jobHostMode';
export const DEFAULT_JOB_HOST_MODE: JobHostMode = 'background';

export async function getJobHostMode(meta: MetaRepository): Promise<JobHostMode> {
  const stored = await meta.get<unknown>(JOB_HOST_MODE_KEY);
  return stored === 'tab' || stored === 'background' ? stored : DEFAULT_JOB_HOST_MODE;
}

export function setJobHostMode(meta: MetaRepository, mode: JobHostMode): Promise<void> {
  return meta.set(JOB_HOST_MODE_KEY, mode);
}
