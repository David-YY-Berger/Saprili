// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import type { Book } from '@/domain/book';
import { getPageImageIds } from '@/layout/render/pageImages';
import type { ResolvedImages } from '@/layout/render/useBlobUrl';
import { AppError } from '@/shared/errors';
import { imageRepository } from '@/storage/repositories';
import type { PrintDocumentModel } from './printJob';

export interface PrintAssetsState {
  images: ResolvedImages;
  loading: boolean;
  error: AppError | null;
}

export function usePrintAssets(
  book: Book | null,
  model: PrintDocumentModel | null,
): PrintAssetsState {
  const [state, setState] = useState<PrintAssetsState>({
    images: new Map(),
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    setState({ images: new Map(), loading: true, error: null });
    if (!book || !model) {
      setState({ images: new Map(), loading: false, error: null });
      return;
    }

    const imageIds = [
      ...new Set(
        model.sheets.flatMap((sheet) =>
          sheet.pageRef ? getPageImageIds(book, sheet.pageRef, sheet.edition) : [],
        ),
      ),
    ];
    void Promise.all(
      imageIds.map(async (id) => {
        const record = await imageRepository.getImage(id);
        if (!record) {
          throw new AppError('PRINT_ASSET_FAILED', {
            userMessage: 'A picture needed for printing could not be loaded.',
            nextStep: 'Return to the page, check its pictures, then try printing again.',
            detail: `Missing image record: ${id}`,
          });
        }
        const url = URL.createObjectURL(record.blob);
        objectUrls.push(url);
        return [id, url] as const;
      }),
    )
      .then((entries) => {
        if (active) setState({ images: new Map(entries), loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          const appError =
            error instanceof AppError
              ? error
              : new AppError('PRINT_ASSET_FAILED', { cause: error });
          setState({ images: new Map(), loading: false, error: appError });
        }
      });

    return () => {
      active = false;
      objectUrls.forEach(URL.revokeObjectURL);
    };
  }, [book, model]);

  return state;
}

export async function waitForPrintAssets(model: PrintDocumentModel): Promise<void> {
  try {
    await document.fonts.ready;
    const images = [...document.querySelectorAll<HTMLImageElement>('.print-sheet img')];
    await Promise.all(
      images.map(async (image) => {
        if (!image.complete || image.naturalWidth === 0) {
          throw new Error(`Image did not finish loading: ${image.currentSrc || image.src}`);
        }
        await image.decode();
      }),
    );
    if (
      model.sheets.length > 0 &&
      document.querySelectorAll('.print-sheet').length !== model.sheets.length
    ) {
      throw new Error('Not all print sheets have rendered.');
    }
  } catch (error) {
    throw new AppError('PRINT_ASSET_FAILED', { cause: error });
  }
}
