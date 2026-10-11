// bisiyata dishmaya, leharbot ahava biyisral
import type { Job, JobBatch, JobPlan } from '@/domain/job';
import type { Clock } from '@/shared/clock';
import { AppError } from '@/shared/errors';
import { newId } from '@/shared/ids';
import type { JobsEvent, JobsSnapshot } from '@/shared/messaging';
import type { JobRepository } from '@/storage/jobRepository';

export interface JobQueueDeps {
  jobRepository: JobRepository;
  clock: Clock;
  emit: (event: JobsEvent) => void;
}

export const DEPENDENCY_FAILED = 'DEPENDENCY_FAILED';

/**
 * Owns every job and batch state change. Changes are serialised and written to storage before
 * they are reported, so a restart never loses or repeats a recorded step.
 */
export class JobQueue {
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: JobQueueDeps) {}

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const run = this.chain.then(work, work);
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async saveJob(job: Job, patch: Partial<Job>): Promise<Job> {
    const next: Job = { ...job, ...patch, updatedAt: this.deps.clock.nowIso() };
    await this.deps.jobRepository.putJob(next);
    this.deps.emit({
      type: 'jobs/progress',
      batchId: next.batchId,
      bookId: next.bookId,
      jobId: next.id,
      status: next.status,
      step: next.step,
    });
    return next;
  }

  private async saveBatch(batch: JobBatch, patch: Partial<JobBatch>): Promise<JobBatch> {
    const next: JobBatch = { ...batch, ...patch };
    if (patch.state && patch.state !== 'paused' && !('pauseReason' in patch)) {
      delete next.pauseReason;
    }
    await this.deps.jobRepository.putBatch(next);
    this.deps.emit({
      type: 'jobs/batchStateChanged',
      batchId: next.id,
      bookId: next.bookId,
      state: next.state,
      pauseReason: next.pauseReason,
    });
    return next;
  }

  private async completeBatchIfDone(batchId: string): Promise<void> {
    const batch = await this.deps.jobRepository.getBatch(batchId);
    if (!batch || batch.state !== 'running') return;
    const jobs = await this.deps.jobRepository.listJobsForBatch(batchId);
    if (jobs.every((job) => job.status !== 'queued' && job.status !== 'running')) {
      await this.saveBatch(batch, { state: 'completed' });
    }
  }

  enqueueBatch(plan: JobPlan): Promise<JobBatch> {
    return this.serial(async () => {
      if (plan.jobs.length === 0) {
        throw new AppError('AI_BAD_RESPONSE', {
          userMessage: 'There is nothing to generate.',
          nextStep: 'Choose at least one page and one job type.',
        });
      }
      const now = this.deps.clock.nowIso();
      const batchId = newId();
      const idByKey = new Map(plan.jobs.map((planned) => [planned.key, newId()]));
      const jobs: Job[] = plan.jobs.map((planned) => ({
        id: idByKey.get(planned.key)!,
        batchId,
        bookId: plan.bookId,
        kind: planned.kind,
        target: planned.target,
        overwrite: planned.overwrite,
        dependsOnJobId: planned.dependsOnKey ? (idByKey.get(planned.dependsOnKey) ?? null) : null,
        status: 'queued',
        step: 'pending',
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      }));
      for (const job of jobs) await this.deps.jobRepository.putJob(job);
      return this.saveBatch(
        {
          id: batchId,
          bookId: plan.bookId,
          jobIds: jobs.map((job) => job.id),
          createdAt: now,
          state: 'running',
        },
        {},
      );
    });
  }

  cancelBatch(batchId: string): Promise<void> {
    return this.serial(async () => {
      const batch = await this.deps.jobRepository.getBatch(batchId);
      if (!batch || batch.state === 'cancelled' || batch.state === 'completed') return;
      // A call already sent to the provider cannot be recalled, so running jobs finish.
      for (const job of await this.deps.jobRepository.listJobsForBatch(batchId)) {
        if (job.status === 'queued' || job.status === 'paused') {
          await this.saveJob(job, { status: 'cancelled' });
        }
      }
      await this.saveBatch(batch, { state: 'cancelled' });
    });
  }

  retryFailed(batchId: string): Promise<void> {
    return this.serial(async () => {
      const batch = await this.deps.jobRepository.getBatch(batchId);
      if (!batch || batch.state === 'cancelled') return;
      let any = false;
      for (const job of await this.deps.jobRepository.listJobsForBatch(batchId)) {
        if (job.status !== 'failed') continue;
        any = true;
        await this.saveJob(job, {
          status: 'queued',
          step: 'pending',
          attempts: 0,
          errorCode: undefined,
          errorMessage: undefined,
          retryAfter: undefined,
        });
      }
      if (any) await this.saveBatch(batch, { state: 'running' });
    });
  }

  resumeBatch(batchId: string): Promise<void> {
    return this.serial(async () => {
      const batch = await this.deps.jobRepository.getBatch(batchId);
      if (batch?.state === 'paused') await this.saveBatch(batch, { state: 'running' });
    });
  }

  getSnapshot(bookId?: string): Promise<JobsSnapshot> {
    return this.serial(async () => {
      const repository = this.deps.jobRepository;
      const open = await repository.listOpenBatches();
      const batches = new Map(open.map((batch) => [batch.id, batch]));
      if (bookId) {
        for (const batch of await repository.listBatchesForBook(bookId)) batches.set(batch.id, batch);
      }
      const selected = [...batches.values()]
        .filter((batch) => !bookId || batch.bookId === bookId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      // The latest finished batch is kept so a reopened dialog can show its outcome.
      const visible = selected.filter(
        (batch, index) =>
          batch.state === 'running' || batch.state === 'paused' || index === selected.length - 1,
      );
      return {
        batches: await Promise.all(
          visible.map(async (batch) => ({
            batch,
            jobs: await repository.listJobsForBatch(batch.id),
          })),
        ),
      };
    });
  }

  /** Marks the next runnable job as running and returns it. */
  claimNext(): Promise<Job | null> {
    return this.serial(async () => {
      const repository = this.deps.jobRepository;
      const nowIso = this.deps.clock.nowIso();
      const batches = (await repository.listOpenBatches())
        .filter((batch) => batch.state === 'running')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      for (const batch of batches) {
        const jobs = await repository.listJobsForBatch(batch.id);
        const byId = new Map(jobs.map((job) => [job.id, job]));
        for (const id of batch.jobIds) {
          const job = byId.get(id);
          if (!job || job.status !== 'queued') continue;
          if (job.retryAfter && job.retryAfter > nowIso) continue;
          if (job.dependsOnJobId) {
            const dependency = byId.get(job.dependsOnJobId);
            if (dependency && (dependency.status === 'queued' || dependency.status === 'running')) {
              continue;
            }
            if (!dependency || dependency.status !== 'succeeded') {
              await this.saveJob(job, {
                status: 'failed',
                step: 'done',
                errorCode: DEPENDENCY_FAILED,
                errorMessage: 'The illustration this colouring page needs was not made.',
              });
              await this.completeBatchIfDone(batch.id);
              continue;
            }
          }
          return this.saveJob(job, {
            status: 'running',
            step: 'generating',
            attempts: job.attempts + 1,
          });
        }
      }
      return null;
    });
  }

  /** Earliest time a delayed retry becomes runnable, if any. */
  nextRetryAt(): Promise<string | null> {
    return this.serial(async () => {
      const waiting: string[] = [];
      for (const batch of await this.deps.jobRepository.listOpenBatches()) {
        if (batch.state !== 'running') continue;
        for (const job of await this.deps.jobRepository.listJobsForBatch(batch.id)) {
          if (job.status === 'queued' && job.retryAfter) waiting.push(job.retryAfter);
        }
      }
      return waiting.sort()[0] ?? null;
    });
  }

  updateStep(jobId: string, step: Job['step']): Promise<void> {
    return this.serial(async () => {
      const job = await this.deps.jobRepository.getJob(jobId);
      if (job?.status === 'running') await this.saveJob(job, { step });
    });
  }

  completeJob(jobId: string): Promise<void> {
    return this.serial(async () => {
      const job = await this.deps.jobRepository.getJob(jobId);
      if (!job) return;
      await this.saveJob(job, { status: 'succeeded', step: 'done' });
      await this.completeBatchIfDone(job.batchId);
    });
  }

  failJob(jobId: string, error: AppError): Promise<void> {
    return this.serial(async () => {
      const job = await this.deps.jobRepository.getJob(jobId);
      if (!job) return;
      await this.saveJob(job, {
        status: 'failed',
        step: 'done',
        errorCode: error.code,
        errorMessage: error.userMessage,
      });
      await this.completeBatchIfDone(job.batchId);
    });
  }

  requeueForRetry(jobId: string, error: AppError, retryAfter: string): Promise<void> {
    return this.serial(async () => {
      const job = await this.deps.jobRepository.getJob(jobId);
      if (!job) return;
      await this.saveJob(job, {
        status: 'queued',
        step: 'pending',
        retryAfter,
        errorCode: error.code,
        errorMessage: error.userMessage,
      });
    });
  }

  /** Key, quota or no-key problems: the job goes back unspent and the batch waits for the user. */
  pauseBatchFatal(jobId: string, error: AppError): Promise<void> {
    return this.serial(async () => {
      const job = await this.deps.jobRepository.getJob(jobId);
      if (!job) return;
      await this.saveJob(job, {
        status: 'queued',
        step: 'pending',
        attempts: Math.max(0, job.attempts - 1),
        errorCode: error.code,
        errorMessage: error.userMessage,
      });
      const batch = await this.deps.jobRepository.getBatch(job.batchId);
      if (!batch || batch.state !== 'running') return;
      const reason = `${error.userMessage} ${error.nextStep}`;
      await this.saveBatch(batch, { state: 'paused', pauseReason: reason });
      this.deps.emit({
        type: 'jobs/fatalStop',
        batchId: batch.id,
        bookId: batch.bookId,
        error: { code: error.code, userMessage: error.userMessage, nextStep: error.nextStep },
      });
    });
  }

  /**
   * Called once when the host starts. Jobs left `running` by a dead host go back to the queue,
   * unless their result was already saved. `'pause'` (browser restart) also stops the batch so
   * the user decides whether to continue.
   */
  recoverInterrupted(
    mode: 'continue' | 'pause',
    hasOutputSince: (job: Job) => Promise<boolean>,
  ): Promise<void> {
    return this.serial(async () => {
      for (const batch of await this.deps.jobRepository.listOpenBatches()) {
        for (const job of await this.deps.jobRepository.listJobsForBatch(batch.id)) {
          if (job.status !== 'running') continue;
          if (await hasOutputSince(job)) {
            await this.saveJob(job, { status: 'succeeded', step: 'done' });
          } else {
            await this.saveJob(job, { status: 'queued', step: 'pending' });
          }
        }
        if (batch.state === 'running') {
          const jobs = await this.deps.jobRepository.listJobsForBatch(batch.id);
          const unfinished = jobs.some((job) => job.status === 'queued');
          if (!unfinished) await this.completeBatchIfDone(batch.id);
          else if (mode === 'pause') {
            const error = new AppError('JOB_INTERRUPTED');
            await this.saveBatch(batch, {
              state: 'paused',
              pauseReason: `${error.userMessage} ${error.nextStep}`,
            });
          }
        }
      }
    });
  }
}
