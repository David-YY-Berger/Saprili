// bisiyata dishmaya, leharbot ahava biyisral
import type { Job } from '@/domain/job';
import { createGenerationService, type GenerationServiceDeps } from '@/ai/generationService';
import type { ImageProvider } from '@/ai/ImageProvider';
import type { Clock } from '@/shared/clock';
import { AppError } from '@/shared/errors';
import type { BookRepository } from '@/storage/bookRepository';
import type { ImageRepository } from '@/storage/imageRepository';
import type { JobRepository } from '@/storage/jobRepository';
import type { SettingsRepository } from '@/storage/settingsStore';
import type { JobsCommand, JobsEvent, JobsResponse } from '@/shared/messaging';
import { JobQueue } from './JobQueue';
import { JobRunner } from './JobRunner';
import type { KeepAliveLike } from './KeepAlive';
import { resumeOnStartup, type ResumeMode } from './resume';

export interface JobHostDeps {
  jobRepository: JobRepository;
  bookRepository: BookRepository;
  imageRepository: ImageRepository;
  settingsRepository: SettingsRepository;
  providerFactory: (modelId: string, apiKey: string) => ImageProvider;
  clock: Clock;
  keepAlive: KeepAliveLike;
  emit: (event: JobsEvent) => void;
  /** Lets tests replace the canvas-based image steps. */
  serviceOverrides?: Pick<GenerationServiceDeps, 'createThumbnail' | 'postprocess'>;
  runnerOptions?: Partial<
    Pick<ConstructorParameters<typeof JobRunner>[0], 'concurrency' | 'setTimer' | 'clearTimer'>
  >;
}

export interface JobHost {
  queue: JobQueue;
  runner: JobRunner;
  handle(command: JobsCommand): Promise<JobsResponse>;
  resume(mode: ResumeMode): Promise<void>;
}

/** Runs one job through the generation service. Uses only worker-safe code. */
export function createJobExecutor(deps: JobHostDeps) {
  const service = createGenerationService({
    providerFactory: deps.providerFactory,
    imageRepository: deps.imageRepository,
    bookRepository: deps.bookRepository,
    settingsRepository: deps.settingsRepository,
    clock: deps.clock,
    ...deps.serviceOverrides,
  });
  return async (job: Job): Promise<void> => {
    if (job.kind === 'coverIllustration') {
      const book = await deps.bookRepository.getBook(job.bookId);
      const customPrompt = book?.cover.illustration.customPrompt.trim();
      await service.generateCoverIllustration(job.bookId, { customPrompt: customPrompt || undefined });
      return;
    }
    if (job.target.kind !== 'story') {
      throw new AppError('STORAGE_FAILED', { detail: 'Story job without a story page' });
    }
    const pageId = job.target.pageId;
    if (job.kind === 'colouring') {
      await service.generateColouringForPage(job.bookId, pageId);
      return;
    }
    const book = await deps.bookRepository.getBook(job.bookId);
    const customPrompt = book?.storyPages.find((page) => page.id === pageId)?.illustration.customPrompt;
    await service.generateIllustrationForPage(job.bookId, pageId, {
      customPrompt: customPrompt?.trim() || undefined,
    });
  };
}

/** True when the job's picture was already saved after the job started, so it must not run again. */
export function createHasOutputSince(deps: Pick<JobHostDeps, 'bookRepository' | 'imageRepository'>) {
  return async (job: Job): Promise<boolean> => {
    const book = await deps.bookRepository.getBook(job.bookId);
    if (!book) return false;
    let imageId: string | null | undefined;
    if (job.kind === 'coverIllustration') imageId = book.cover.illustration.currentImageId;
    else if (job.target.kind === 'story') {
      const page = book.storyPages.find((candidate) => candidate.id === (job.target as { pageId: string }).pageId);
      imageId = job.kind === 'colouring' ? page?.colouring.imageId : page?.illustration.currentImageId;
    }
    if (!imageId) return false;
    const record = await deps.imageRepository.getImage(imageId);
    const generatedAt = record?.meta.generatedAt;
    return !!generatedAt && generatedAt >= job.updatedAt;
  };
}

export function createJobHost(deps: JobHostDeps): JobHost {
  const queue = new JobQueue({
    jobRepository: deps.jobRepository,
    clock: deps.clock,
    emit: deps.emit,
  });
  const runner = new JobRunner({
    queue,
    execute: createJobExecutor(deps),
    keepAlive: deps.keepAlive,
    clock: deps.clock,
    ...deps.runnerOptions,
  });
  const hasOutputSince = createHasOutputSince(deps);

  return {
    queue,
    runner,
    resume: (mode) => resumeOnStartup({ queue, runner, mode, hasOutputSince }),
    async handle(command) {
      try {
        switch (command.type) {
          case 'jobs/enqueue': {
            const batch = await queue.enqueueBatch(command.plan);
            void runner.pump();
            return { ok: true, batchId: batch.id };
          }
          case 'jobs/cancelBatch':
            await queue.cancelBatch(command.batchId);
            return { ok: true, batchId: command.batchId };
          case 'jobs/retryFailed':
            await queue.retryFailed(command.batchId);
            void runner.pump();
            return { ok: true, batchId: command.batchId };
          case 'jobs/resume':
            await queue.resumeBatch(command.batchId);
            void runner.pump();
            return { ok: true, batchId: command.batchId };
          case 'jobs/getSnapshot':
            return { ok: true, snapshot: await queue.getSnapshot(command.bookId) };
        }
      } catch (caught) {
        const error = caught instanceof AppError ? caught : new AppError('STORAGE_FAILED', { cause: caught });
        return {
          ok: false,
          error: { code: error.code, userMessage: error.userMessage, nextStep: error.nextStep },
        };
      }
    },
  };
}
