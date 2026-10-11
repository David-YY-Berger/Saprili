// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from './book';
import type { IllustrationState, PhotoRef } from './page';

/** Every image id a book points at; anything else stored for the book is an orphan. */
export function listReferencedImageIds(book: Book): Set<string> {
  const ids = new Set<string>();
  const add = (id: string | null) => {
    if (id !== null) ids.add(id);
  };
  const addPhotos = (photos: PhotoRef[]) =>
    photos.forEach((p) => {
      add(p.originalImageId);
      add(p.aiCopyImageId);
    });
  const addIllustration = (s: IllustrationState) => {
    add(s.currentImageId);
    s.history.forEach((h) => add(h.imageId));
  };

  addPhotos(book.intro.photos);
  addPhotos(book.intro.characters.flatMap((c) => (c.photo ? [c.photo] : [])));
  for (const page of book.storyPages) {
    addPhotos(page.photos);
    addIllustration(page.illustration);
    add(page.colouring.imageId);
    add(page.colouring.sourceIllustrationImageId);
  }
  addIllustration(book.cover.illustration);
  add(book.cover.ownImageId);
  add(book.colophon.qrImageId);
  return ids;
}

/** Returns a copy of the book with image ids replaced; unmapped ids are kept. */
export function remapImageIds(book: Book, mapping: ReadonlyMap<string, string>): Book {
  const map = (id: string) => mapping.get(id) ?? id;
  const mapNullable = (id: string | null) => (id === null ? null : map(id));
  const mapPhotos = (photos: PhotoRef[]): PhotoRef[] =>
    photos.map((p) => ({
      originalImageId: map(p.originalImageId),
      aiCopyImageId: map(p.aiCopyImageId),
    }));
  const mapIllustration = (s: IllustrationState): IllustrationState => ({
    ...s,
    currentImageId: mapNullable(s.currentImageId),
    history: s.history.map((h) => ({ ...h, imageId: map(h.imageId) })),
  });

  return {
    ...book,
    intro: {
      ...book.intro,
      photos: mapPhotos(book.intro.photos),
      characters: book.intro.characters.map((c) => ({
        ...c,
        photo: c.photo ? mapPhotos([c.photo])[0]! : null,
      })),
    },
    storyPages: book.storyPages.map((page) => ({
      ...page,
      photos: mapPhotos(page.photos),
      illustration: mapIllustration(page.illustration),
      colouring: {
        ...page.colouring,
        imageId: mapNullable(page.colouring.imageId),
        sourceIllustrationImageId: mapNullable(page.colouring.sourceIllustrationImageId),
      },
    })),
    cover: {
      ...book.cover,
      illustration: mapIllustration(book.cover.illustration),
      ownImageId: mapNullable(book.cover.ownImageId),
    },
    colophon: { ...book.colophon, qrImageId: mapNullable(book.colophon.qrImageId) },
  };
}
