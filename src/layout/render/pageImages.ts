// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { findPage } from '@/domain/ordering';
import type { PageRef } from '@/domain/page';
import { getIntroPhotoCount } from './introPhotos';
import type { Edition } from '../theme';

/** The cover artwork: the user's own image wins over the selected artwork mode. */
export function getCoverImageIds(book: Book): string[] {
  if (book.cover.ownImageId) return [book.cover.ownImageId];
  if (book.cover.artworkMode === 'introCollage') {
    return book.intro.photos
      .slice(0, getIntroPhotoCount(book.intro.photos.length, book.intro.photoLayout))
      .map((photo) => photo.originalImageId);
  }
  if (book.cover.artworkMode === 'characterPortraits') {
    const portraits = new Map(
      book.cover.characterPortraits.map(({ characterId, imageId }) => [characterId, imageId]),
    );
    return book.intro.characters.flatMap((character) => {
      const imageId = portraits.get(character.id);
      return imageId ? [imageId] : [];
    });
  }
  return book.cover.illustration.currentImageId ? [book.cover.illustration.currentImageId] : [];
}

/** The selected back-cover artwork; the source photo is never printed directly in generate mode. */
export function getBackCoverImageId(book: Book): string | null {
  return book.cover.back.artworkMode === 'upload'
    ? book.cover.back.ownImageId
    : book.cover.back.generatedImageId;
}

/** Image ids the page needs for the given edition. Intro always prints the original photos. */
export function getPageImageIds(book: Book, pageRef: PageRef, edition: Edition): string[] {
  if (pageRef.kind === 'intro') {
    return book.intro.photos
      .slice(0, getIntroPhotoCount(book.intro.photos.length, book.intro.photoLayout))
      .map((p) => p.originalImageId);
  }
  if (pageRef.kind === 'story') {
    const page = findPage(book, pageRef);
    if (!page || !('illustration' in page)) return [];
    const id = edition === 'colouring' ? page.colouring.imageId : page.illustration.currentImageId;
    return id ? [id] : [];
  }
  return book.colophon.qrImageId ? [book.colophon.qrImageId] : [];
}
