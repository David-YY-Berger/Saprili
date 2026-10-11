// bisiyata dishmaya, leharbot ahava biyisral
import type { TrimPresetId } from '@/domain/book';
import { TRIM_PRESETS } from '@/domain/constants';
import { systemClock } from '@/shared/clock';
import { AppError } from '@/shared/errors';
import { bookRepository } from '@/storage/repositories';
import { onFormatLocked } from './formatLockHook';

export interface SetupChoices {
  presetId: TrimPresetId;
}

export async function confirmSetup(bookId: string, choices: SetupChoices) {
  const book = await bookRepository.getBook(bookId);
  if (!book) throw new AppError('STORAGE_FAILED', { detail: `Book ${bookId} does not exist` });
  if (book.format.lockedAt !== null) {
    throw new AppError('STORAGE_FAILED', {
      userMessage: 'This book format has already been set.',
      nextStep: 'Open the book to continue.',
    });
  }

  const preset = TRIM_PRESETS.find((item) => item.id === choices.presetId);
  if (!preset) throw new AppError('STORAGE_FAILED', { detail: 'Unknown trim preset' });
  const saved = await bookRepository.save(
    {
      ...book,
      format: {
        trimWidthMm: preset.widthMm,
        trimHeightMm: preset.heightMm,
        orientation: 'portrait',
        textPosition: 'below',
        presetId: preset.id,
        lockedAt: systemClock.nowIso(),
      },
    },
    'userEdit',
  );
  onFormatLocked(saved);
  return saved;
}
