// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { ImageRepository } from '@/storage/imageRepository';
import type { ImageGenRequest } from './ImageProvider';
import {
  COLOURING_INSTRUCTIONS,
  COVER_INSTRUCTIONS,
  EDIT_INSTRUCTIONS,
  ILLUSTRATION_INSTRUCTIONS,
} from './promptTemplates';
import { getPictureZoneSpec, getCoverPictureZoneSpec } from '@/layout/shape';
import { MAX_AI_PHOTOS_INTRO, MAX_AI_PHOTOS_PAGE } from '@/domain/constants';
import { AppError } from '@/shared/errors';

export interface AiPhotoSelection {
  images: Blob[];
  omittedCount: number;
}

export interface PromptOptions {
  customPrompt?: string;
  artStyleText?: string;
}

const HEBREW_CHARACTERS = /[\u0590-\u05ff\uFB1D-\uFB4F\uFB50-\uFDFF\uFE70-\uFEFF]/g;

export function stripHebrew(text: string): string {
  return text.replace(HEBREW_CHARACTERS, '');
}

export async function getAiPhotoSelection(
  photoRefs: readonly { aiCopyImageId: string }[],
  imageRepository: Pick<ImageRepository, 'getImage'>,
  maxPhotos: number,
): Promise<AiPhotoSelection> {
  const selected = photoRefs.slice(0, maxPhotos);
  const records = await Promise.all(selected.map(({ aiCopyImageId }) => imageRepository.getImage(aiCopyImageId)));
  if (records.some((record) => !record)) {
    throw new AppError('STORAGE_FAILED', { detail: 'An AI-copy photo is missing from storage' });
  }
  return {
    images: records.map((record) => record!.blob),
    omittedCount: Math.max(0, photoRefs.length - selected.length),
  };
}

function textPart(label: string, value: string): string {
  return `${label}: ${stripHebrew(value).trim()}`;
}

function makeRequest(
  instructions: string,
  referenceImages: Blob[],
  targetAspect: number,
): ImageGenRequest {
  return {
    instructions,
    referenceImages,
    targetAspect,
    sizeHint: '1024px long edge',
    qualityTier: 'medium',
  };
}

export async function buildIllustrationRequest(
  book: Book,
  pageId: string,
  options: PromptOptions,
  imageRepository: Pick<ImageRepository, 'getImage'>,
): Promise<ImageGenRequest & { omittedPhotoCount: number }> {
  const page = book.storyPages.find((candidate) => candidate.id === pageId);
  if (!page) throw new AppError('STORAGE_FAILED', { detail: `Story page ${pageId} was not found` });
  const [introPhotos, pagePhotos] = await Promise.all([
    getAiPhotoSelection(book.intro.photos, imageRepository, MAX_AI_PHOTOS_INTRO),
    getAiPhotoSelection(page.photos, imageRepository, MAX_AI_PHOTOS_PAGE),
  ]);
  const instructions = [
    ILLUSTRATION_INSTRUCTIONS,
    textPart('Introduction (character reference)', book.intro.textEn),
    textPart('This page’s story', page.textEn),
    textPart('Art style', options.artStyleText ?? book.artStyleText),
    options.customPrompt?.trim()
      ? `Additional illustration instruction: ${stripHebrew(options.customPrompt.trim())}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  const request = makeRequest(
    instructions,
    [...introPhotos.images, ...pagePhotos.images],
    getPictureZoneSpec(book).aspect,
  );
  return { ...request, omittedPhotoCount: introPhotos.omittedCount + pagePhotos.omittedCount };
}

export async function buildColouringRequest(
  book: Book,
  pageId: string,
  imageRepository: Pick<ImageRepository, 'getImage'>,
): Promise<ImageGenRequest> {
  const page = book.storyPages.find((candidate) => candidate.id === pageId);
  if (!page) throw new AppError('STORAGE_FAILED', { detail: `Story page ${pageId} was not found` });
  if (!page.illustration.currentImageId) throw new AppError('AI_BAD_RESPONSE');
  const illustration = await imageRepository.getImage(page.illustration.currentImageId);
  if (!illustration) throw new AppError('STORAGE_FAILED', { detail: 'The illustration is missing' });
  return makeRequest(COLOURING_INSTRUCTIONS, [illustration.blob], getPictureZoneSpec(book).aspect);
}

export async function buildCoverIllustrationRequest(
  book: Book,
  imageRepository: Pick<ImageRepository, 'getImage'>,
): Promise<ImageGenRequest & { omittedPhotoCount: number }> {
  const introPhotos = await getAiPhotoSelection(
    book.intro.photos,
    imageRepository,
    MAX_AI_PHOTOS_INTRO,
  );
  const instructions = [
    COVER_INSTRUCTIONS,
    textPart('Introduction (character reference)', book.intro.textEn),
    textPart('Art style', book.artStyleText),
  ].join('\n\n');
  return {
    ...makeRequest(
      instructions,
      introPhotos.images,
      getCoverPictureZoneSpec(book).aspect,
    ),
    omittedPhotoCount: introPhotos.omittedCount,
  };
}

export async function buildEditRequest(
  book: Book,
  pageId: string,
  customPrompt: string,
  imageRepository: Pick<ImageRepository, 'getImage'>,
): Promise<ImageGenRequest> {
  const page = book.storyPages.find((candidate) => candidate.id === pageId);
  if (!page?.illustration.currentImageId) throw new AppError('AI_BAD_RESPONSE');
  const illustration = await imageRepository.getImage(page.illustration.currentImageId);
  if (!illustration) throw new AppError('STORAGE_FAILED', { detail: 'The illustration is missing' });
  return makeRequest(
    [
      EDIT_INSTRUCTIONS,
      `Additional edit instruction: ${stripHebrew(customPrompt.trim())}`,
      textPart('Art style', book.artStyleText),
    ].join('\n\n'),
    [illustration.blob],
    getPictureZoneSpec(book).aspect,
  );
}

export function describeRequestForDebug(request: ImageGenRequest): {
  referenceImageCount: number;
  targetAspect: number;
  sizeHint: string;
  qualityTier: string;
  instructionCharacterCount: number;
} {
  return {
    referenceImageCount: request.referenceImages.length,
    targetAspect: request.targetAspect,
    sizeHint: request.sizeHint,
    qualityTier: request.qualityTier,
    instructionCharacterCount: request.instructions.length,
  };
}
