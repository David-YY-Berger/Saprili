// bisiyata dishmaya, leharbot ahava biyisral
import type { Job, JobBatch } from '@/domain/job';
import type { RepositoryDeps } from './deps';
import { putOp } from './StorageProvider';

export interface JobRepository {
  putJob(job: Job): Promise<void>;
  getJob(id: string): Promise<Job | null>;
  listJobsForBatch(batchId: string): Promise<Job[]>;
  putBatch(batch: JobBatch): Promise<void>;
  getBatch(id: string): Promise<JobBatch | null>;
  /** Batches that are still running or paused. */
  listOpenBatches(): Promise<JobBatch[]>;
}

export function createJobRepository({ storage }: RepositoryDeps): JobRepository {
  return {
    putJob: (job) => storage().apply([putOp('jobs', job)]),
    getJob: async (id) => (await storage().get('jobs', id)) ?? null,
    listJobsForBatch: (batchId) => storage().getAllByIndex('jobs', 'batchId', batchId),
    putBatch: (batch) => storage().apply([putOp('batches', batch)]),
    getBatch: async (id) => (await storage().get('batches', id)) ?? null,
    async listOpenBatches() {
      const all = await storage().getAll('batches');
      return all.filter((b) => b.state === 'running' || b.state === 'paused');
    },
  };
}
