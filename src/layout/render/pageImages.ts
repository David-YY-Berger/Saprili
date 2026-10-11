// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import { findPage } from '@/domain/ordering';
import type { PageRef } from '@/domain/page';
import { getIntroPhotoCount } from './introPhotos';
import type { Edition } from '../theme';

/** The cover picture: the user's own image wins over a generated illustration. */
export function getCoverImageIds(book: Book): string[] {
  const id = book.cover.ownImageId ?? book.cover.illustration.currentImageId;
  return id ? [id] : [];
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
