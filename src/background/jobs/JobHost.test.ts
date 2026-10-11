// bisiyata dishmaya, leharbot ahava biyisral
import { beforeEach, describe, expect, it } from 'vitest';
import type { ImageGenRequest, ImageProvider } from '@/ai/ImageProvider';
import { MockImageProvider, type MockProviderFault } from '@/ai/providers/MockImageProvider';
import type { Book } from '@/domain/book';
import { createEmptyBook, createStoryPage } from '@/domain/factories';
import type { JobPlan } from '@/domain/job';
import { fixedClock } from '@/shared/clock';
import type { JobsEvent } from '@/shared/messaging';
import { createBookRepository } from '@/storage/bookRepository';
import { createImageRepository } from '@/storage/imageRepository';
import { createJobRepository } from '@/storage/jobRepository';
import { InMemorySettingsRepository } from '@/storage/settingsStore';
import { createTestStorage } from '@/storage/testing';
import { buildJobPlan, selectAll, type JobSwitches } from '@/features/generate/jobPlan';
import { createJobHost, type JobHost } from './JobHost';
import { MAX_JOB_ATTEMPTS } from './RetryPolicy';

const T0 = '2026-01-01T00:00:00.000Z';

describe('job host', () => {
  let storage: ReturnType<typeof createTestStorage>;
  let clock: ReturnType<typeof fixedClock>;
  let books: ReturnType<typeof createBookRepository>;
  let images: ReturnType<typeof createImageRepository>;
  let jobRepo: ReturnType<typeof createJobRepository>;
  let settings: InMemorySettingsRepository;
  let events: JobsEvent[];
  let calls: { modelId: string; request: ImageGenRequest }[];
  let active: number;
  let maxActive: number;
  let fault: MockProviderFault;
  let faultOnce: MockProviderFault[];
  let gate: Promise<void> | null;
  let timers: (() => void)[];

  const makeHost = (): JobHost => {
    const providerFactory = (modelId: string): ImageProvider => {
      const run = async (request: ImageGenRequest, edit: boolean) => {
        calls.push({ modelId, request });
        active += 1;
        maxActive = Math.max(maxActive, active);
        try {
          if (gate) await gate;
          else await new Promise((resolve) => setTimeout(resolve, 2));
          const mock = new MockImageProvider(modelId, faultOnce.shift() ?? fault);
          return edit ? await mock.editImage(request) : await mock.generateImage(request);
        } finally {
          active -= 1;
        }
      };
      return {
        generateImage: (request) => run(request, false),
        editImage: (request) => run(request, true),
      };
    };
    return createJobHost({
      jobRepository: jobRepo,
      bookRepository: books,
      imageRepository: images,
      settingsRepository: settings,
      providerFactory,
      clock,
      keepAlive: { start: () => undefined, stop: () => undefined },
      emit: (event) => events.push(event),
      serviceOverrides: {
        createThumbnail: async () => ({ blob: new Blob(['thumb']), widthPx: 1, heightPx: 1 }),
        postprocess: {
          fitToShape: async (blob) => blob,
          detectGreyLevels: async () => false,
          forceBlackWhite: async (blob) => blob,
          measureImage: async () => ({ widthPx: 800, heightPx: 1100 }),
        },
      },
      runnerOptions: {
        setTimer: (callback) => {
          timers.push(callback);
          return callback;
        },
        clearTimer: (handle) => {
          timers = timers.filter((timer) => timer !== handle);
        },
      },
    });
  };

  const bothSwitches: JobSwitches = {
    illustrations: { enabled: true, overwrite: false },
    colouring: { enabled: true, overwrite: false },
  };
  const illustrationsOnly: JobSwitches = {
    ...bothSwitches,
    colouring: { enabled: false, overwrite: false },
  };

  const planFor = (book: Book, switches = bothSwitches): JobPlan =>
    buildJobPlan(book, selectAll(book), switches);
  const pagePlan = (book: Book, pageIds: string[], switches = bothSwitches): JobPlan =>
    buildJobPlan(book, { cover: false, pageIds: new Set(pageIds) }, switches);
  const loadBook = async () => (await books.getBook('book'))!;
  const batchId = (response: Awaited<ReturnType<JobHost['handle']>>) =>
    response.ok ? response.batchId! : '';
  const latest = async (host: JobHost) => (await host.queue.getSnapshot('book')).batches.at(-1)!;
  const waitForCalls = async (count: number) => {
    for (let i = 0; i < 200 && calls.length < count; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    expect(calls).toHaveLength(count);
  };

  beforeEach(async () => {
    storage = createTestStorage();
    clock = fixedClock(T0);
    const deps = { storage: () => storage, clock };
    books = createBookRepository(deps);
    images = createImageRepository(deps);
    jobRepo = createJobRepository(deps);
    settings = new InMemorySettingsRepository();
    await settings.saveUserSettings({
      schemaVersion: 2,
      illustrationModelId: 'gemini-3-pro-image',
      colouringModelId: 'gemini-3.1-flash-lite-image',
      apiKey: 'test-key',
    });
    events = [];
    calls = [];
    active = 0;
    maxActive = 0;
    fault = null;
    faultOnce = [];
    gate = null;
    timers = [];
    const book = createEmptyBook({ id: 'book', nowIso: T0 });
    book.storyPages = [1, 2, 3, 4].map((n) =>
      createStoryPage({ id: `page-${n}`, textEn: `Story ${n}.` }),
    );
    await books.createBook(book);
  });

  it('runs a whole batch with at most two calls at a time and colouring after its illustration', async () => {
    const host = makeHost();
    const plan = planFor(await loadBook());
    expect(plan.summary).toEqual({ illustrations: 5, colourings: 4, totalCalls: 9 });
    await host.handle({ type: 'jobs/enqueue', plan });
    await host.runner.whenIdle();

    const book = await loadBook();
    expect(maxActive).toBe(2);
    expect(calls).toHaveLength(9);
    for (const page of book.storyPages) {
      expect(page.illustration.currentImageId).not.toBeNull();
      expect(page.colouring.imageId).not.toBeNull();
      expect(page.colouring.outdated).toBe(false);
    }
    expect(book.cover.illustration.currentImageId).not.toBeNull();
    const { batch, jobs } = await latest(host);
    expect(batch.state).toBe('completed');
    expect(jobs.every((job) => job.status === 'succeeded')).toBe(true);
  });

  it('keeps every concurrent result on the same book', async () => {
    const host = makeHost();
    await host.handle({ type: 'jobs/enqueue', plan: planFor(await loadBook(), illustrationsOnly) });
    await host.runner.whenIdle();
    const book = await loadBook();
    expect(book.storyPages.every((page) => page.illustration.currentImageId !== null)).toBe(true);
    expect(book.cover.illustration.currentImageId).not.toBeNull();
  });

  it('writes job state to storage when a job starts, before it finishes', async () => {
    const host = makeHost();
    let release!: () => void;
    gate = new Promise((resolve) => {
      release = resolve;
    });
    await host.handle({ type: 'jobs/enqueue', plan: planFor(await loadBook()) });
    await host.runner.pump();
    const [batch] = await jobRepo.listOpenBatches();
    const running = (await jobRepo.listJobsForBatch(batch!.id)).filter((job) => job.status === 'running');
    expect(running).toHaveLength(2);
    expect(running.every((job) => job.step === 'generating' && job.attempts === 1)).toBe(true);
    release();
    await host.runner.whenIdle();
  });

  it('pauses the whole batch on a quota stop and continues after resume', async () => {
    const host = makeHost();
    fault = 'rateLimit';
    const response = await host.handle({ type: 'jobs/enqueue', plan: planFor(await loadBook()) });
    await host.runner.whenIdle();

    const { batch, jobs } = await latest(host);
    expect(batch.state).toBe('paused');
    expect(batch.pauseReason).toBeTruthy();
    expect(jobs.some((job) => job.status === 'failed')).toBe(false);
    expect(jobs.every((job) => job.status === 'queued')).toBe(true);
    expect(events.some((event) => event.type === 'jobs/fatalStop')).toBe(true);
    const callsWhilePaused = calls.length;
    await host.runner.whenIdle();
    expect(calls).toHaveLength(callsWhilePaused);

    fault = null;
    await host.handle({ type: 'jobs/resume', batchId: batchId(response) });
    await host.runner.whenIdle();
    const after = await latest(host);
    expect(after.batch.state).toBe('completed');
    expect(after.jobs.every((job) => job.status === 'succeeded')).toBe(true);
  });

  it('fails only a refused job and its colouring page, then retries both', async () => {
    const host = makeHost();
    faultOnce = ['refuse'];
    const response = await host.handle({
      type: 'jobs/enqueue',
      plan: pagePlan(await loadBook(), ['page-1', 'page-2']),
    });
    await host.runner.whenIdle();

    let { batch, jobs } = await latest(host);
    expect(jobs.filter((job) => job.status === 'failed').map((job) => job.errorCode).sort()).toEqual([
      'AI_REFUSED',
      'DEPENDENCY_FAILED',
    ]);
    expect(jobs.filter((job) => job.status === 'succeeded')).toHaveLength(2);
    expect(batch.state).toBe('completed');

    await host.handle({ type: 'jobs/retryFailed', batchId: batchId(response) });
    await host.runner.whenIdle();
    ({ batch, jobs } = await latest(host));
    expect(batch.state).toBe('completed');
    expect(jobs.every((job) => job.status === 'succeeded')).toBe(true);
  });

  it('retries a temporary error after a backoff', async () => {
    const host = makeHost();
    faultOnce = ['timeout'];
    await host.handle({
      type: 'jobs/enqueue',
      plan: pagePlan(await loadBook(), ['page-1'], illustrationsOnly),
    });
    await host.runner.whenIdle();
    let [job] = (await latest(host)).jobs;
    expect(job!.status).toBe('queued');
    expect(job!.retryAfter! > T0).toBe(true);
    expect(timers).toHaveLength(1);

    clock.set(job!.retryAfter!);
    await host.runner.whenIdle();
    [job] = (await latest(host)).jobs;
    expect(job).toMatchObject({ status: 'succeeded', attempts: 2 });
  });

  it('gives up after the maximum number of attempts', async () => {
    const host = makeHost();
    fault = 'timeout';
    await host.handle({
      type: 'jobs/enqueue',
      plan: pagePlan(await loadBook(), ['page-1'], illustrationsOnly),
    });
    for (let attempt = 0; attempt < MAX_JOB_ATTEMPTS; attempt += 1) {
      await host.runner.whenIdle();
      const [job] = (await latest(host)).jobs;
      if (job!.retryAfter) clock.set(job!.retryAfter);
    }
    const { batch, jobs } = await latest(host);
    expect(jobs[0]).toMatchObject({ status: 'failed', attempts: MAX_JOB_ATTEMPTS, errorCode: 'AI_TEMPORARY' });
    expect(batch.state).toBe('completed');
  });

  it('cancel stops remaining work but lets calls already sent finish', async () => {
    const host = makeHost();
    let release!: () => void;
    gate = new Promise((resolve) => {
      release = resolve;
    });
    const response = await host.handle({ type: 'jobs/enqueue', plan: planFor(await loadBook()) });
    await host.runner.pump();
    await host.handle({ type: 'jobs/cancelBatch', batchId: batchId(response) });
    release();
    await host.runner.whenIdle();

    expect(calls).toHaveLength(2);
    const { batch, jobs } = await latest(host);
    expect(batch.state).toBe('cancelled');
    expect(jobs.filter((job) => job.status === 'succeeded')).toHaveLength(2);
    expect(jobs.filter((job) => job.status === 'cancelled')).toHaveLength(jobs.length - 2);
  });

  it('continues from storage after the host is replaced, repeating only unfinished jobs', async () => {
    const first = makeHost();
    gate = new Promise(() => undefined); // The first host's calls never return: it "died".
    await first.handle({ type: 'jobs/enqueue', plan: planFor(await loadBook()) });
    await first.runner.pump();
    await waitForCalls(2);

    gate = null;
    const second = makeHost();
    await second.resume('continue');
    await second.runner.whenIdle();

    const { batch, jobs } = await latest(second);
    expect(batch.state).toBe('completed');
    expect(jobs.every((job) => job.status === 'succeeded')).toBe(true);
    // 9 jobs in all; the two interrupted ones were sent again once each.
    expect(calls).toHaveLength(2 + 9);
  });

  it('pauses interrupted batches after a browser restart until the user resumes', async () => {
    const first = makeHost();
    gate = new Promise(() => undefined);
    const response = await first.handle({ type: 'jobs/enqueue', plan: planFor(await loadBook()) });
    await first.runner.pump();
    await waitForCalls(2);

    gate = null;
    const second = makeHost();
    await second.resume('pause');
    await second.runner.whenIdle();
    let { batch } = await latest(second);
    expect(batch.state).toBe('paused');
    expect(batch.pauseReason).toBeTruthy();
    expect(calls).toHaveLength(2);

    await second.handle({ type: 'jobs/resume', batchId: batchId(response) });
    await second.runner.whenIdle();
    ({ batch } = await latest(second));
    expect(batch.state).toBe('completed');
  });

  it('does not run a job again when its picture was saved before the restart', async () => {
    const first = makeHost();
    await first.handle({
      type: 'jobs/enqueue',
      plan: pagePlan(await loadBook(), ['page-1'], illustrationsOnly),
    });
    await first.runner.whenIdle();
    const { batch, jobs } = await latest(first);
    // A crash after the picture was saved but before the job was marked done.
    await jobRepo.putJob({ ...jobs[0]!, status: 'running', step: 'generating', updatedAt: T0 });
    await jobRepo.putBatch({ ...batch, state: 'running' });
    const before = calls.length;

    const second = makeHost();
    await second.resume('continue');
    await second.runner.whenIdle();
    expect(calls).toHaveLength(before);
    const result = await latest(second);
    expect(result.jobs[0]!.status).toBe('succeeded');
    expect(result.batch.state).toBe('completed');
  });
});
