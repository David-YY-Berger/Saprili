// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { ImageRepository } from '@/storage/imageRepository';
import type { ImageGenRequest } from './ImageProvider';
import {
  COVER_CHARACTER_INSTRUCTIONS,
  COLOURING_INSTRUCTIONS,
  COVER_INSTRUCTIONS,
  EDIT_INSTRUCTIONS,
  ILLUSTRATION_INSTRUCTIONS,
} from './promptTemplates';
import { getPictureZoneSpec, getCoverPictureZoneSpec } from '@/layout/shape';
import { MAX_AI_CHARACTERS, MAX_AI_PHOTOS_INTRO, MAX_AI_PHOTOS_PAGE } from '@/domain/constants';
import { AppError } from '@/shared/errors';
import { computeCharacterPortraitLayout } from '@/layout/render/introPhotos';
import { computeCoverGeometry } from '@/layout/coverGeometry';

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
  const records = await Promise.all(
    selected.map(({ aiCopyImageId }) => imageRepository.getImage(aiCopyImageId)),
  );
  if (records.some((record) => !record)) {
    throw new AppError('STORAGE_FAILED', { detail: 'An AI-copy photo is missing from storage' });
  }
  return {
    images: records.map((record) => record!.blob),
    omittedCount: Math.max(0, photoRefs.length - selected.length),
  };
}

export interface CharacterReference {
  images: Blob[];
  text: string;
  omittedCount: number;
}

/** Character pictures go first, in order; the text numbers each picture so name/description match it. */
export async function getCharacterReference(
  book: Book,
  imageRepository: Pick<ImageRepository, 'getImage'>,
): Promise<CharacterReference> {
  const characters = book.intro.characters.filter(
    (c) => c.photo !== null || c.name.trim() !== '' || c.description.trim() !== '',
  );
  const sent = characters.slice(0, MAX_AI_CHARACTERS);
  const images: Blob[] = [];
  const lines: string[] = [];
  for (const [index, character] of sent.entries()) {
    let pictureNote = 'no picture';
    if (character.photo) {
      const record = await imageRepository.getImage(character.photo.aiCopyImageId);
      if (!record) {
        throw new AppError('STORAGE_FAILED', {
          detail: 'A character picture is missing from storage',
        });
      }
      images.push(record.blob);
      pictureNote = `reference picture ${images.length}`;
    }
    const name = stripHebrew(character.name).trim() || `Character ${index + 1}`;
    const description = stripHebrew(character.description).trim();
    lines.push(`- ${name} (${pictureNote})${description ? `: ${description}` : ''}`);
  }
  return {
    images,
    text: lines.length > 0 ? `Main characters:\n${lines.join('\n')}` : '',
    omittedCount: Math.max(0, characters.length - sent.length),
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

/** Character profiles are the reference; intro photos are used only when no characters are defined. */
async function getIntroReference(
  book: Book,
  imageRepository: Pick<ImageRepository, 'getImage'>,
): Promise<CharacterReference> {
  const characters = await getCharacterReference(book, imageRepository);
  if (characters.text) return characters;
  const photos = await getAiPhotoSelection(book.intro.photos, imageRepository, MAX_AI_PHOTOS_INTRO);
  return { images: photos.images, text: '', omittedCount: photos.omittedCount };
}

export async function buildIllustrationRequest(
  book: Book,
  pageId: string,
  options: PromptOptions,
  imageRepository: Pick<ImageRepository, 'getImage'>,
): Promise<ImageGenRequest & { omittedPhotoCount: number }> {
  const page = book.storyPages.find((candidate) => candidate.id === pageId);
  if (!page) throw new AppError('STORAGE_FAILED', { detail: `Story page ${pageId} was not found` });
  const [introReference, pagePhotos] = await Promise.all([
    getIntroReference(book, imageRepository),
    getAiPhotoSelection(page.photos, imageRepository, MAX_AI_PHOTOS_PAGE),
  ]);
  const instructions = [
    ILLUSTRATION_INSTRUCTIONS,
    introReference.text,
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
    [...introReference.images, ...pagePhotos.images],
    getPictureZoneSpec(book).aspect,
  );
  return { ...request, omittedPhotoCount: introReference.omittedCount + pagePhotos.omittedCount };
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
  if (!illustration)
    throw new AppError('STORAGE_FAILED', { detail: 'The illustration is missing' });
  return makeRequest(COLOURING_INSTRUCTIONS, [illustration.blob], getPictureZoneSpec(book).aspect);
}

export async function buildCoverIllustrationRequest(
  book: Book,
  imageRepository: Pick<ImageRepository, 'getImage'>,
): Promise<ImageGenRequest & { omittedPhotoCount: number }> {
  const introReference = await getIntroReference(book, imageRepository);
  const instructions = [
    COVER_INSTRUCTIONS,
    introReference.text,
    textPart('Introduction (character reference)', book.intro.textEn),
    textPart('Art style', book.artStyleText),
  ]
    .filter(Boolean)
    .join('\n\n');
  return {
    ...makeRequest(instructions, introReference.images, getCoverPictureZoneSpec(book).aspect),
    omittedPhotoCount: introReference.omittedCount,
  };
}

export async function buildCoverCharacterRequests(
  book: Book,
  imageRepository: Pick<ImageRepository, 'getImage'>,
  options: PromptOptions = {},
): Promise<{
  requests: { characterId: string; request: ImageGenRequest }[];
  omittedCount: number;
}> {
  const characters = book.intro.characters.filter(
    (character) =>
      character.photo !== null ||
      character.name.trim() !== '' ||
      character.description.trim() !== '',
  );
  const selected = characters.slice(0, MAX_AI_CHARACTERS);
  if (selected.length === 0) {
    throw new AppError('AI_BAD_RESPONSE', {
      userMessage: 'Add at least one main character before generating cover portraits.',
      nextStep: 'Add a character on the intro page, then try again.',
    });
  }
  const geometry = computeCoverGeometry(book);
  const cells = computeCharacterPortraitLayout(selected.length, geometry.frontPictureRect);
  const requests = await Promise.all(
    selected.map(async (character, index) => {
      const referenceImages: Blob[] = [];
      if (character.photo) {
        const record = await imageRepository.getImage(character.photo.aiCopyImageId);
        if (!record) {
          throw new AppError('STORAGE_FAILED', {
            detail: 'A character picture is missing from storage',
          });
        }
        referenceImages.push(record.blob);
      }
      const name =
        stripHebrew(character.name).trim() ||
        `Character ${book.intro.characters.indexOf(character) + 1}`;
      const description = stripHebrew(character.description).trim();
      const instructions = [
        COVER_CHARACTER_INSTRUCTIONS,
        `Character: ${name}${description ? `\nDescription: ${description}` : ''}`,
        textPart('Art style', options.artStyleText ?? book.artStyleText),
        options.customPrompt?.trim()
          ? `Additional cover instruction: ${stripHebrew(options.customPrompt.trim())}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');
      return {
        characterId: character.id,
        request: makeRequest(
          instructions,
          referenceImages,
          cells[index]!.width / cells[index]!.height,
        ),
      };
    }),
  );
  return { requests, omittedCount: Math.max(0, characters.length - selected.length) };
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
  if (!illustration)
    throw new AppError('STORAGE_FAILED', { detail: 'The illustration is missing' });
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
