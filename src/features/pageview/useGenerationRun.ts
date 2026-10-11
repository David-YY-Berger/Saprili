// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Book } from '@/domain/book';
import type { UserSettings } from '@/domain/settings';
import type { GenerationOptions } from '@/ai/generationService';
import { createGenerationService } from '@/ai/generationService';
import { requestGeminiPermission } from '@/ai/geminiPermission';
import { createProvider } from '@/ai/providers';
import { systemClock } from '@/shared/clock';
import { AppError, toAppError } from '@/shared/errors';
import { bookRepository, getSettingsRepository, imageRepository } from '@/storage/repositories';

export type GenerationAction = 'illustration' | 'colouring' | 'cover';

export function useGenerationRun(
  bookId: string,
  beforeGeneration: () => Promise<unknown>,
  onComplete: (book: Book) => Promise<unknown> | unknown,
) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsError, setSettingsError] = useState<unknown>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [omittedPhotoCount, setOmittedPhotoCount] = useState(0);
  const runningRef = useRef(false);

  const loadSettings = useCallback(async () => {
    setSettingsError(null);
    try {
      setSettings(await getSettingsRepository().getUserSettings());
    } catch (loadError) {
      setSettingsError(loadError);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const run = useCallback(
    async (action: GenerationAction, pageId?: string, options: GenerationOptions = {}) => {
      setError(null);
      setOmittedPhotoCount(0);
      if (settingsError !== null) {
        setError(settingsError);
        return;
      }
      if (settings === null) {
        setError(new AppError('STORAGE_FAILED', { detail: 'AI settings have not loaded' }));
        return;
      }
      if (!settings.apiKey?.trim()) {
        setError(new AppError('AI_NO_KEY'));
        return;
      }
      if (runningRef.current) return;
      if (__SAPRILI_PROVIDER__ !== 'mock') {
        const permission = requestGeminiPermission();
        runningRef.current = true;
        setRunning(true);
        try {
          await permission;
        } catch (permissionError) {
          setError(permissionError);
          runningRef.current = false;
          setRunning(false);
          return;
        }
      } else {
        runningRef.current = true;
        setRunning(true);
      }
      try {
        await beforeGeneration();
        const service = createGenerationService({
          providerFactory: createProvider,
          imageRepository,
          bookRepository,
          settingsRepository: getSettingsRepository(),
          clock: systemClock,
        });
        const result =
          action === 'cover'
            ? await service.generateCoverIllustration(bookId, options)
            : action === 'illustration'
              ? await service.generateIllustrationForPage(bookId, pageId!, options)
              : await service.generateColouringForPage(bookId, pageId!);
        setOmittedPhotoCount(result.omittedPhotoCount);
        await onComplete(result.book);
      } catch (runError) {
        setError(runError);
      } finally {
        runningRef.current = false;
        setRunning(false);
      }
    },
    [beforeGeneration, bookId, onComplete, settings, settingsError],
  );

  const runLocal = useCallback(
    async (pageId: string, file: File) => {
      setError(null);
      if (runningRef.current) return;
      runningRef.current = true;
      setRunning(true);
      try {
        await beforeGeneration();
        const service = createGenerationService({
          providerFactory: createProvider,
          imageRepository,
          bookRepository,
          settingsRepository: getSettingsRepository(),
          clock: systemClock,
        });
        const book = await service.uploadOwnIllustration(bookId, pageId, file);
        await onComplete(book);
      } catch (runError) {
        setError(runError);
      } finally {
        runningRef.current = false;
        setRunning(false);
      }
    },
    [beforeGeneration, bookId, onComplete],
  );

  const restoreVersion = useCallback(
    async (pageId: string, imageId: string) => {
      setError(null);
      if (runningRef.current) return;
      runningRef.current = true;
      setRunning(true);
      try {
        await beforeGeneration();
        const service = createGenerationService({
          providerFactory: createProvider,
          imageRepository,
          bookRepository,
          settingsRepository: getSettingsRepository(),
          clock: systemClock,
        });
        const book = await service.restoreIllustrationVersion(bookId, pageId, imageId);
        await onComplete(book);
      } catch (restoreError) {
        setError(restoreError);
      } finally {
        runningRef.current = false;
        setRunning(false);
      }
    },
    [beforeGeneration, bookId, onComplete],
  );

  const restoreCoverVersion = useCallback(
    async (imageId: string) => {
      setError(null);
      if (runningRef.current) return;
      runningRef.current = true;
      setRunning(true);
      try {
        await beforeGeneration();
        const service = createGenerationService({
          providerFactory: createProvider,
          imageRepository,
          bookRepository,
          settingsRepository: getSettingsRepository(),
          clock: systemClock,
        });
        const book = await service.restoreCoverIllustrationVersion(bookId, imageId);
        await onComplete(book);
      } catch (restoreError) {
        setError(restoreError);
      } finally {
        runningRef.current = false;
        setRunning(false);
      }
    },
    [beforeGeneration, bookId, onComplete],
  );

  return {
    error: error === null ? null : toAppError(error),
    omittedPhotoCount,
    run,
    runLocal,
    restoreCoverVersion,
    restoreVersion,
    running,
    settings,
    settingsLoaded: settings !== null || settingsError !== null,
  };
}
