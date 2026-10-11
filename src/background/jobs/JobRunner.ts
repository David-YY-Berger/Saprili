// bisiyata dishmaya, leharbot ahava biyisral
import type { Job } from '@/domain/job';
import { JOB_CONCURRENCY } from '@/domain/constants';
import type { Clock } from '@/shared/clock';
import { toAppError } from '@/shared/errors';
import type { JobQueue } from './JobQueue';
import type { KeepAliveLike } from './KeepAlive';
import { backoffMs, isFatalStop, shouldRetry } from './RetryPolicy';

export interface JobRunnerDeps {
  queue: JobQueue;
  /** Performs one job through the generation service; throws on failure. */
  execute: (job: Job) => Promise<void>;
  keepAlive: KeepAliveLike;
  clock: Clock;
  concurrency?: number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export class JobRunner {
  private readonly inFlight = new Map<string, Promise<void>>();
  private pumpPromise: Promise<void> | null = null;
  private pumpAgain = false;
  private timer: unknown = null;
  private readonly concurrency: number;

  constructor(private readonly deps: JobRunnerDeps) {
    this.concurrency = deps.concurrency ?? JOB_CONCURRENCY;
  }

  get runningCount(): number {
    return this.inFlight.size;
  }

  /** Starts one more job if there is room and something is runnable. */
  async runNext(): Promise<boolean> {
    if (this.inFlight.size >= this.concurrency) return false;
    const job = await this.deps.queue.claimNext();
    if (!job) return false;
    const work = this.runJob(job).finally(() => {
      this.inFlight.delete(job.id);
      void this.pump();
    });
    this.inFlight.set(job.id, work);
    return true;
  }

  /** Fills every free slot, then arms the retry timer and keep-alive. */
  pump(): Promise<void> {
    if (this.pumpPromise) {
      this.pumpAgain = true;
      return this.pumpPromise;
    }
    this.pumpPromise = this.pumpLoop().finally(() => {
      this.pumpPromise = null;
    });
    return this.pumpPromise;
  }

  private async pumpLoop(): Promise<void> {
    do {
      this.pumpAgain = false;
      while (await this.runNext()) {
        // keep filling slots
      }
      await this.armRetryTimer();
    } while (this.pumpAgain);
    if (this.inFlight.size > 0 || this.timer !== null) this.deps.keepAlive.start();
    else this.deps.keepAlive.stop();
  }

  /** Resolves when nothing is running and nothing is runnable right now. */
  async whenIdle(): Promise<void> {
    await this.pump();
    while (this.inFlight.size > 0) {
      await Promise.allSettled([...this.inFlight.values()]);
      await this.pump();
    }
  }

  private async armRetryTimer(): Promise<void> {
    if (this.timer !== null) {
      const clear = this.deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
      clear(this.timer);
      this.timer = null;
    }
    const next = await this.deps.queue.nextRetryAt();
    if (!next) return;
    const delay = Math.max(0, new Date(next).getTime() - this.deps.clock.now().getTime());
    const setTimer = this.deps.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
    this.timer = setTimer(() => {
      this.timer = null;
      void this.pump();
    }, delay);
  }

  private async runJob(job: Job): Promise<void> {
    const { queue } = this.deps;
    try {
      await this.deps.execute(job);
      await queue.completeJob(job.id);
    } catch (caught) {
      const error = toAppError(caught, 'AI_BAD_RESPONSE');
      if (isFatalStop(error)) {
        await queue.pauseBatchFatal(job.id, error);
      } else if (shouldRetry(error, job.attempts)) {
        const retryAt = new Date(this.deps.clock.now().getTime() + backoffMs(job.attempts));
        await queue.requeueForRetry(job.id, error, retryAt.toISOString());
      } else {
        await queue.failJob(job.id, error);
      }
    }
  }
}
