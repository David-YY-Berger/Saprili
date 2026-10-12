// bisiyata dishmaya, leharbot ahava biyisral
import { ILLUSTRATION_HISTORY_MAX } from '@/domain/constants';
import type { Book } from '@/domain/book';
import type { IllustrationState, StoryPage } from '@/domain/page';
import type { ImageRecord } from '@/domain/image';
import { newId } from '@/shared/ids';
import { AppError } from '@/shared/errors';
import type { Clock } from '@/shared/clock';
import type { BookRepository } from '@/storage/bookRepository';
import type { ImageRepository } from '@/storage/imageRepository';
import type { SettingsRepository } from '@/storage/settingsStore';
import type { SaveReason } from '@/storage/bookRepository';
import type { ProviderFactory } from './ImageProvider';
import {
  buildColouringRequest,
  buildCoverCharacterRequests,
  buildCoverIllustrationRequest,
  buildEditRequest,
  buildIllustrationRequest,
  type PromptOptions,
  stripHebrew,
} from './prompts';
import { createThumbnail } from '@/storage/thumbnails';
import { detectGreyLevels, fitToShape, forceBlackWhite, measureImage } from './postprocess';

export interface GenerationServiceDeps {
  providerFactory: ProviderFactory;
  imageRepository: ImageRepository;
  bookRepository: BookRepository;
  settingsRepository: SettingsRepository;
  clock: Clock;
  createThumbnail?: typeof createThumbnail;
  postprocess?: {
    fitToShape: typeof fitToShape;
    detectGreyLevels: typeof detectGreyLevels;
    forceBlackWhite: typeof forceBlackWhite;
    measureImage: typeof measureImage;
  };
}

export interface GenerationOptions extends PromptOptions {
  useEditMode?: boolean;
  apiKey?: string;
  modelId?: string;
}

export interface GenerationResult {
  book: Book;
  imageId: string;
  omittedPhotoCount: number;
}

export function pushIllustrationVersion(
  state: IllustrationState,
  newImageId: string,
  nowIso: string,
): IllustrationState {
  const history = state.currentImageId
    ? [{ imageId: state.currentImageId, replacedAt: nowIso }, ...state.history]
    : state.history;
  return {
    ...state,
    currentImageId: newImageId,
    history: history.slice(0, ILLUSTRATION_HISTORY_MAX),
  };
}

export function markColouringOutdated(page: StoryPage): StoryPage {
  return { ...page, colouring: { ...page.colouring, outdated: true } };
}

function getStoryPage(book: Book, pageId: string): StoryPage {
  const page = book.storyPages.find((candidate) => candidate.id === pageId);
  if (!page) throw new AppError('STORAGE_FAILED', { detail: `Story page ${pageId} was not found` });
  return page;
}

function setStoryPage(book: Book, pageId: string, update: (page: StoryPage) => StoryPage): Book {
  return {
    ...book,
    storyPages: book.storyPages.map((page) => (page.id === pageId ? update(page) : page)),
  };
}

// Concurrent batch jobs on one book must not overwrite each other's saved results.
const bookLocks = new Map<string, Promise<unknown>>();

function withBookLock<T>(bookId: string, work: () => Promise<T>): Promise<T> {
  const previous = bookLocks.get(bookId) ?? Promise.resolve();
  const run = previous.then(work, work);
  const tail = run.catch(() => undefined);
  bookLocks.set(bookId, tail);
  void tail.then(() => {
    if (bookLocks.get(bookId) === tail) bookLocks.delete(bookId);
  });
  return run;
}

export function createGenerationService(deps: GenerationServiceDeps) {
  const postprocess = deps.postprocess ?? {
    fitToShape,
    detectGreyLevels,
    forceBlackWhite,
    measureImage,
  };
  const thumbnailFactory = deps.createThumbnail ?? createThumbnail;

  async function getBookAndSettings(bookId: string): Promise<{
    book: Book;
    apiKey: string;
    illustrationModelId: string;
    colouringModelId: string;
  }> {
    const [book, settings] = await Promise.all([
      deps.bookRepository.getBook(bookId),
      deps.settingsRepository.getUserSettings(),
    ]);
    if (!book) throw new AppError('STORAGE_FAILED', { detail: `Book ${bookId} was not found` });
    const apiKey = settings.apiKey?.trim();
    if (!apiKey) throw new AppError('AI_NO_KEY');
    return {
      book,
      apiKey,
      illustrationModelId: settings.illustrationModelId,
      colouringModelId: settings.colouringModelId,
    };
  }

  async function getBook(bookId: string): Promise<Book> {
    const book = await deps.bookRepository.getBook(bookId);
    if (!book) throw new AppError('STORAGE_FAILED', { detail: `Book ${bookId} was not found` });
    return book;
  }

  async function saveGeneratedImage(
    book: Book,
    kind: ImageRecord['kind'],
    result: { image: Blob; modelId: string },
    croppedEdgePercent = 0,
  ): Promise<ImageRecord> {
    const nowIso = deps.clock.nowIso();
    const dimensions = await postprocess.measureImage(result.image);
    const record: ImageRecord = {
      id: newId(),
      bookId: book.id,
      kind,
      blob: result.image,
      mime: result.image.type || 'image/png',
      widthPx: dimensions.widthPx,
      heightPx: dimensions.heightPx,
      byteSize: result.image.size,
      createdAt: nowIso,
      meta: {
        source: 'generated',
        modelId: result.modelId,
        generatedAt: nowIso,
        croppedEdgePercent,
      },
    };
    await deps.imageRepository.putImage(record, await thumbnailFactory(result.image));
    return record;
  }

  async function storeBookAndCleanup(
    book: Book,
    newImageId: string,
    expiredImageIds: readonly string[],
    reason: SaveReason = 'generation',
  ): Promise<Book> {
    let saved: Book;
    try {
      saved = await deps.bookRepository.save(book, reason);
    } catch (error) {
      try {
        await deps.imageRepository.deleteImage(newImageId);
      } catch (cleanupError) {
        throw new AppError('STORAGE_FAILED', {
          cause: cleanupError,
          detail: 'Generation failed and its unsaved image could not be removed',
        });
      }
      throw error;
    }
    for (const imageId of expiredImageIds) await deps.imageRepository.deleteImage(imageId);
    return saved;
  }

  async function storeBookAndCleanupMany(
    book: Book,
    newImageIds: readonly string[],
    expiredImageIds: readonly string[],
  ): Promise<Book> {
    let saved: Book;
    try {
      saved = await deps.bookRepository.save(book, 'generation');
    } catch (error) {
      await deleteImages(newImageIds);
      throw error;
    }
    await deleteImages(expiredImageIds);
    return saved;
  }

  async function deleteImages(imageIds: readonly string[]): Promise<void> {
    let firstError: unknown;
    let failedCount = 0;
    for (const imageId of imageIds) {
      try {
        await deps.imageRepository.deleteImage(imageId);
      } catch (error) {
        firstError ??= error;
        failedCount += 1;
      }
    }
    if (failedCount > 0) {
      throw new AppError('STORAGE_FAILED', {
        cause: firstError,
        detail: `Could not remove ${failedCount} replaced or incomplete cover image(s)`,
      });
    }
  }

  /** Applies a generated image to the latest saved book; removes the image if that fails. */
  async function applyToLatestBook(
    bookId: string,
    newImageId: string,
    build: (latest: Book) => { book: Book; expired: readonly string[] },
  ): Promise<Book> {
    return withBookLock(bookId, async () => {
      let built: { book: Book; expired: readonly string[] };
      try {
        built = build(await getBook(bookId));
      } catch (error) {
        await deps.imageRepository.deleteImage(newImageId).catch(() => undefined);
        throw error;
      }
      return storeBookAndCleanup(built.book, newImageId, built.expired);
    });
  }

  async function generateIllustrationForPage(
    bookId: string,
    pageId: string,
    options: GenerationOptions = {},
  ): Promise<GenerationResult> {
    const { book, apiKey, illustrationModelId } = await getBookAndSettings(bookId);
    getStoryPage(book, pageId);
    const modelId = options.modelId ?? illustrationModelId;
    const provider = deps.providerFactory(modelId, options.apiKey ?? apiKey);
    const request = options.useEditMode
      ? await buildEditRequest(book, pageId, options.customPrompt ?? '', deps.imageRepository)
      : await buildIllustrationRequest(book, pageId, options, deps.imageRepository);
    const result = options.useEditMode
      ? await provider.editImage(request)
      : await provider.generateImage(request);
    const sourceSize = await postprocess.measureImage(result.image);
    const image = await postprocess.fitToShape(result.image, request.targetAspect);
    const fittedSize = await postprocess.measureImage(image);
    const croppedEdgePercent = Math.max(
      ((sourceSize.widthPx - fittedSize.widthPx) / sourceSize.widthPx) * 100,
      ((sourceSize.heightPx - fittedSize.heightPx) / sourceSize.heightPx) * 100,
      0,
    );
    const record = await saveGeneratedImage(
      book,
      'illustration',
      { ...result, image },
      croppedEdgePercent,
    );
    const saved = await applyToLatestBook(bookId, record.id, (latest) => {
      const latestPage = getStoryPage(latest, pageId);
      const expired = [
        ...(latestPage.illustration.currentImageId ? [latestPage.illustration.currentImageId] : []),
        ...latestPage.illustration.history.map((entry) => entry.imageId),
      ].slice(ILLUSTRATION_HISTORY_MAX);
      const nextState = pushIllustrationVersion(
        latestPage.illustration,
        record.id,
        deps.clock.nowIso(),
      );
      return {
        book: setStoryPage(latest, pageId, (current) =>
          markColouringOutdated({ ...current, illustration: nextState }),
        ),
        expired,
      };
    });
    return {
      book: saved,
      imageId: record.id,
      omittedPhotoCount:
        'omittedPhotoCount' in request && typeof request.omittedPhotoCount === 'number'
          ? request.omittedPhotoCount
          : 0,
    };
  }

  async function generateColouringForPage(bookId: string, pageId: string): Promise<GenerationResult> {
    const { book, apiKey, colouringModelId } = await getBookAndSettings(bookId);
    const page = getStoryPage(book, pageId);
    if (!page.illustration.currentImageId) {
      throw new AppError('AI_BAD_RESPONSE', {
        userMessage: 'Generate an illustration before making a colouring page.',
        nextStep: 'Create an illustration for this story page first.',
      });
    }
    const request = await buildColouringRequest(book, pageId, deps.imageRepository);
    const provider = deps.providerFactory(colouringModelId, apiKey);
    const result = await provider.generateImage(request);
    const sourceSize = await postprocess.measureImage(result.image);
    let image = await postprocess.fitToShape(result.image, request.targetAspect);
    const fittedSize = await postprocess.measureImage(image);
    const croppedEdgePercent = Math.max(
      ((sourceSize.widthPx - fittedSize.widthPx) / sourceSize.widthPx) * 100,
      ((sourceSize.heightPx - fittedSize.heightPx) / sourceSize.heightPx) * 100,
      0,
    );
    if (await postprocess.detectGreyLevels(image)) image = await postprocess.forceBlackWhite(image, 190);
    const record = await saveGeneratedImage(
      book,
      'colouring',
      { ...result, image },
      croppedEdgePercent,
    );
    const saved = await applyToLatestBook(bookId, record.id, (latest) => {
      const latestPage = getStoryPage(latest, pageId);
      return {
        book: setStoryPage(latest, pageId, (current) => ({
          ...current,
          colouring: {
            imageId: record.id,
            sourceIllustrationImageId: current.illustration.currentImageId,
            outdated: false,
          },
        })),
        expired: latestPage.colouring.imageId ? [latestPage.colouring.imageId] : [],
      };
    });
    return { book: saved, imageId: record.id, omittedPhotoCount: 0 };
  }

  async function generateCoverIllustration(
    bookId: string,
    options: GenerationOptions = {},
  ): Promise<GenerationResult> {
    const { book, apiKey, illustrationModelId } = await getBookAndSettings(bookId);
    const modelId = options.modelId ?? illustrationModelId;
    const provider = deps.providerFactory(modelId, options.apiKey ?? apiKey);
    const request = await buildCoverIllustrationRequest(book, deps.imageRepository);
    const result = await provider.generateImage({
      ...request,
      instructions: options.customPrompt
        ? `${request.instructions}\n\nAdditional cover instruction: ${stripHebrew(options.customPrompt)}`
        : request.instructions,
    });
    const sourceSize = await postprocess.measureImage(result.image);
    const image = await postprocess.fitToShape(result.image, request.targetAspect);
    const fittedSize = await postprocess.measureImage(image);
    const croppedEdgePercent = Math.max(
      ((sourceSize.widthPx - fittedSize.widthPx) / sourceSize.widthPx) * 100,
      ((sourceSize.heightPx - fittedSize.heightPx) / sourceSize.heightPx) * 100,
      0,
    );
    const record = await saveGeneratedImage(
      book,
      'coverIllustration',
      { ...result, image },
      croppedEdgePercent,
    );
    const saved = await applyToLatestBook(bookId, record.id, (latest) => {
      const previousState = latest.cover.illustration;
      const expired = [
        ...(previousState.currentImageId ? [previousState.currentImageId] : []),
        ...previousState.history.map((entry) => entry.imageId),
      ].slice(ILLUSTRATION_HISTORY_MAX);
      const illustration = pushIllustrationVersion(previousState, record.id, deps.clock.nowIso());
      return { book: { ...latest, cover: { ...latest.cover, illustration } }, expired };
    });
    return { book: saved, imageId: record.id, omittedPhotoCount: request.omittedPhotoCount };
  }

  async function generateCoverCharacterPortraits(
    bookId: string,
    options: GenerationOptions = {},
  ): Promise<GenerationResult> {
    const { book, apiKey, illustrationModelId } = await getBookAndSettings(bookId);
    if (book.cover.ownImageId) {
      throw new AppError('AI_BAD_RESPONSE', {
        userMessage: 'Remove the cover image before generating character portraits.',
        nextStep: 'Remove the own image or keep using it as the cover artwork.',
      });
    }
    const modelId = options.modelId ?? illustrationModelId;
    const provider = deps.providerFactory(modelId, options.apiKey ?? apiKey);
    const { requests, omittedCount } = await buildCoverCharacterRequests(
      book,
      deps.imageRepository,
      options,
    );
    const records: ImageRecord[] = [];
    try {
      for (const { request } of requests) {
        const result = await provider.generateImage(request);
        const sourceSize = await postprocess.measureImage(result.image);
        const image = await postprocess.fitToShape(result.image, request.targetAspect);
        const fittedSize = await postprocess.measureImage(image);
        const croppedEdgePercent = Math.max(
          ((sourceSize.widthPx - fittedSize.widthPx) / sourceSize.widthPx) * 100,
          ((sourceSize.heightPx - fittedSize.heightPx) / sourceSize.heightPx) * 100,
          0,
        );
        records.push(
          await saveGeneratedImage(
            book,
            'coverIllustration',
            { ...result, image },
            croppedEdgePercent,
          ),
        );
      }
    } catch (error) {
      await deleteImages(records.map(({ id }) => id));
      throw error;
    }
    const portraits = requests.map(({ characterId }, index) => ({
      characterId,
      imageId: records[index]!.id,
    }));
    const saved = await withBookLock(bookId, async () => {
      const latest = await getBook(bookId);
      const currentCharacterIds = new Set(latest.intro.characters.map((character) => character.id));
      const currentPortraits = portraits.filter(({ characterId }) =>
        currentCharacterIds.has(characterId),
      );
      if (currentPortraits.length === 0) {
        await deleteImages(records.map(({ id }) => id));
        throw new AppError('STORAGE_FAILED', {
          detail: 'The intro characters changed before cover portraits could be saved',
        });
      }
      const currentImageIds = new Set(currentPortraits.map(({ imageId }) => imageId));
      const unusedImageIds = records
        .map(({ id }) => id)
        .filter((imageId) => !currentImageIds.has(imageId));
      await deleteImages(unusedImageIds);
      const expired = latest.cover.characterPortraits.map(({ imageId }) => imageId);
      return storeBookAndCleanupMany(
        {
          ...latest,
          cover: {
            ...latest.cover,
            artworkMode: 'characterPortraits',
            characterPortraits: currentPortraits,
          },
        },
        [...currentImageIds],
        expired,
      );
    });
    return {
      book: saved,
      imageId: saved.cover.characterPortraits[0]!.imageId,
      omittedPhotoCount: omittedCount,
    };
  }

  async function restoreIllustrationVersion(
    bookId: string,
    pageId: string,
    imageId: string,
  ): Promise<Book> {
    const book = await getBook(bookId);
    const page = getStoryPage(book, pageId);
    const selected = page.illustration.history.find((entry) => entry.imageId === imageId);
    if (!selected) throw new AppError('STORAGE_FAILED', { detail: 'Illustration history entry was not found' });
    const nextState: IllustrationState = {
      ...page.illustration,
      currentImageId: imageId,
      history: [
        ...(page.illustration.currentImageId
          ? [{ imageId: page.illustration.currentImageId, replacedAt: deps.clock.nowIso() }]
          : []),
        ...page.illustration.history.filter((entry) => entry.imageId !== imageId),
      ].slice(0, ILLUSTRATION_HISTORY_MAX),
    };
    const nextHistory = [
      ...(page.illustration.currentImageId
        ? [{ imageId: page.illustration.currentImageId, replacedAt: deps.clock.nowIso() }]
        : []),
      ...page.illustration.history.filter((entry) => entry.imageId !== imageId),
    ];
    const expired = nextHistory.slice(ILLUSTRATION_HISTORY_MAX).map((entry) => entry.imageId);
    const saved = await deps.bookRepository.save(
      setStoryPage(book, pageId, (current) =>
        markColouringOutdated({ ...current, illustration: nextState }),
      ),
      'generation',
    );
    for (const expiredImageId of expired) await deps.imageRepository.deleteImage(expiredImageId);
    return saved;
  }

  async function restoreCoverIllustrationVersion(bookId: string, imageId: string): Promise<Book> {
    const book = await getBook(bookId);
    const selected = book.cover.illustration.history.find((entry) => entry.imageId === imageId);
    if (!selected) throw new AppError('STORAGE_FAILED', { detail: 'Cover history entry was not found' });
    const current = book.cover.illustration;
    const illustration: IllustrationState = {
      ...current,
      currentImageId: imageId,
      history: [
        ...(current.currentImageId
          ? [{ imageId: current.currentImageId, replacedAt: deps.clock.nowIso() }]
          : []),
        ...current.history.filter((entry) => entry.imageId !== imageId),
      ].slice(0, ILLUSTRATION_HISTORY_MAX),
    };
    const nextHistory = [
      ...(current.currentImageId
        ? [{ imageId: current.currentImageId, replacedAt: deps.clock.nowIso() }]
        : []),
      ...current.history.filter((entry) => entry.imageId !== imageId),
    ];
    const expired = nextHistory.slice(ILLUSTRATION_HISTORY_MAX).map((entry) => entry.imageId);
    const saved = await deps.bookRepository.save(
      { ...book, cover: { ...book.cover, illustration } },
      'generation',
    );
    for (const expiredImageId of expired) await deps.imageRepository.deleteImage(expiredImageId);
    return saved;
  }

  async function uploadOwnIllustration(bookId: string, pageId: string, file: File): Promise<Book> {
    if (!file.type.startsWith('image/')) {
      throw new AppError('IMAGE_DECODE_FAILED', { detail: 'Illustration upload is not an image file' });
    }
    const book = await getBook(bookId);
    const page = getStoryPage(book, pageId);
    const dimensions = await measureImage(file);
    const record: ImageRecord = {
      id: newId(),
      bookId,
      kind: 'illustration',
      blob: file,
      mime: file.type,
      widthPx: dimensions.widthPx,
      heightPx: dimensions.heightPx,
      byteSize: file.size,
      createdAt: deps.clock.nowIso(),
      meta: { source: 'uploaded' },
    };
    await deps.imageRepository.putImage(record, await thumbnailFactory(file));
    const expired = [
      ...(page.illustration.currentImageId ? [page.illustration.currentImageId] : []),
      ...page.illustration.history.map((entry) => entry.imageId),
    ].slice(ILLUSTRATION_HISTORY_MAX);
    const nextState = pushIllustrationVersion(page.illustration, record.id, deps.clock.nowIso());
    const nextBook = setStoryPage(book, pageId, (current) =>
      markColouringOutdated({ ...current, illustration: nextState }),
    );
    return storeBookAndCleanup(nextBook, record.id, expired, 'userEdit');
  }

  return {
    generateIllustrationForPage,
    generateColouringForPage,
    generateCoverIllustration,
    generateCoverCharacterPortraits,
    restoreIllustrationVersion,
    restoreCoverIllustrationVersion,
    uploadOwnIllustration,
  };
}
