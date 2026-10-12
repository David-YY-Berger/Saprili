// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { ImageRecord } from '@/domain/image';

export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  path: string;
  blob: Blob;
}

export type BackupImageSource = Pick<
  ImageRecord,
  'id' | 'kind' | 'mime' | 'widthPx' | 'heightPx' | 'byteSize' | 'createdAt' | 'meta'
>;

export interface BackupImageEntry {
  id: string;
  path: string;
  kind: ImageRecord['kind'];
  mime: string;
  widthPx: number;
  heightPx: number;
  byteSize: number;
  createdAt: string;
  meta: ImageRecord['meta'];
}

export interface BackupManifest {
  formatVersion: number;
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  bookId: string;
  files: { path: string; size: number }[];
}

function extensionFor(record: Pick<ImageRecord, 'mime'>): string {
  const subtype = record.mime.split('/')[1]?.split(';')[0]?.toLowerCase();
  if (subtype === 'jpeg') return 'jpg';
  if (subtype && /^[a-z0-9.+-]+$/.test(subtype)) return subtype;
  return 'bin';
}

function pageImagePaths(book: Book): Map<string, string> {
  const paths = new Map<string, string>();
  const addPhotos = (photos: Book['intro']['photos'], folder: string) => {
    photos.forEach((photo, index) => {
      const number = index + 1;
      paths.set(photo.originalImageId, `${folder}/photo-${number}-original`);
      paths.set(photo.aiCopyImageId, `${folder}/photo-${number}-ai-copy`);
    });
  };
  const addIllustration = (
    state: Book['cover']['illustration'],
    folder: string,
    currentName: string,
  ) => {
    if (state.currentImageId) paths.set(state.currentImageId, `${folder}/${currentName}`);
    state.history.forEach((entry, index) => {
      paths.set(entry.imageId, `${folder}/illustration-history-${index + 1}`);
    });
  };

  addPhotos(book.intro.photos, 'pages/00-intro');
  book.intro.characters.forEach((character, index) => {
    if (!character.photo) return;
    const base = `pages/00-intro/character-${index + 1}`;
    paths.set(character.photo.originalImageId, `${base}-original`);
    paths.set(character.photo.aiCopyImageId, `${base}-ai-copy`);
  });
  book.storyPages.forEach((page, index) => {
    const folder = `pages/${String(index + 1).padStart(2, '0')}-story`;
    addPhotos(page.photos, folder);
    addIllustration(page.illustration, folder, 'illustration');
    if (page.colouring.imageId) paths.set(page.colouring.imageId, `${folder}/colouring`);
  });
  addIllustration(book.cover.illustration, 'cover', 'illustration');
  book.cover.characterPortraits.forEach((portrait, index) => {
    paths.set(portrait.imageId, `cover/character-${index + 1}`);
  });
  if (book.cover.ownImageId) paths.set(book.cover.ownImageId, 'cover/own-image');
  if (book.cover.back.referenceImageId)
    paths.set(book.cover.back.referenceImageId, 'cover/back-reference');
  if (book.cover.back.generatedImageId)
    paths.set(book.cover.back.generatedImageId, 'cover/back-illustration');
  if (book.cover.back.ownImageId) paths.set(book.cover.back.ownImageId, 'cover/back-own-image');
  if (book.colophon.qrImageId) paths.set(book.colophon.qrImageId, 'colophon/qr');
  return paths;
}

export function imageIdsForPage(book: Book, pageId: string): string[] {
  let prefix: string;
  if (pageId === book.intro.id) {
    prefix = 'pages/00-intro/';
  } else if (pageId === 'colophon') {
    prefix = 'colophon/';
  } else {
    const storyIndex = book.storyPages.findIndex((page) => page.id === pageId);
    if (storyIndex < 0) throw new Error(`Page ${pageId} does not belong to book ${book.id}`);
    prefix = `pages/${String(storyIndex + 1).padStart(2, '0')}-story/`;
  }
  return [...pageImagePaths(book)]
    .filter(([, path]) => path.startsWith(prefix))
    .map(([id]) => id);
}

export function zipPathForImage(record: BackupImageSource, book: Book): string {
  const base = pageImagePaths(book).get(record.id) ?? `images/unreferenced-${record.id}`;
  return `${base}.${extensionFor(record)}`;
}

export function buildBackupFilePlan(
  book: Book,
  imageRecords: readonly BackupImageSource[],
): { files: BackupFile[]; images: BackupImageEntry[] } {
  const files: BackupFile[] = [
    { path: 'pages/00-intro/text-en.txt', blob: new Blob([book.intro.textEn], { type: 'text/plain' }) },
    { path: 'pages/00-intro/text-he.txt', blob: new Blob([book.intro.textHe], { type: 'text/plain' }) },
    {
      path: 'pages/00-intro/characters.txt',
      blob: new Blob(
        [book.intro.characters.map((c) => `${c.name}: ${c.description}`).join('\n')],
        { type: 'text/plain' },
      ),
    },
  ];
  book.storyPages.forEach((page, index) => {
    const folder = `pages/${String(index + 1).padStart(2, '0')}-story`;
    files.push(
      { path: `${folder}/text-en.txt`, blob: new Blob([page.textEn], { type: 'text/plain' }) },
      { path: `${folder}/text-he.txt`, blob: new Blob([page.textHe], { type: 'text/plain' }) },
    );
  });

  const images: BackupImageEntry[] = imageRecords.map((record) => ({
    id: record.id,
    path: zipPathForImage(record, book),
    kind: record.kind,
    mime: record.mime,
    widthPx: record.widthPx,
    heightPx: record.heightPx,
    byteSize: record.byteSize,
    createdAt: record.createdAt,
    meta: record.meta,
  }));
  return { files, images };
}

export function buildPageFilePlan(
  book: Book,
  pageId: string,
  imageRecords: readonly ImageRecord[],
): BackupFile[] {
  let folder: string;
  let page: Book['intro'] | Book['storyPages'][number] | null;
  if (pageId === book.intro.id) {
    folder = 'page-00-intro';
    page = book.intro;
  } else {
    const storyIndex = book.storyPages.findIndex((candidate) => candidate.id === pageId);
    if (storyIndex >= 0) {
      folder = `page-${String(storyIndex + 1).padStart(2, '0')}-story`;
      page = book.storyPages[storyIndex]!;
    } else if (pageId === 'colophon') {
      folder = 'page-colophon';
      page = null;
    } else {
      throw new Error(`Page ${pageId} does not belong to book ${book.id}`);
    }
  }
  const files: BackupFile[] = [];
  if (page) {
    files.push(
      { path: `${folder}/text-en.txt`, blob: new Blob([page.textEn], { type: 'text/plain' }) },
      { path: `${folder}/text-he.txt`, blob: new Blob([page.textHe], { type: 'text/plain' }) },
    );
  }
  for (const image of imageRecords) {
    const path = zipPathForImage(image, book);
    if (
      (pageId === book.intro.id && path.startsWith('pages/00-intro/')) ||
      (pageId === 'colophon' && path.startsWith('colophon/')) ||
      (pageId !== book.intro.id &&
        pageId !== 'colophon' &&
        path.startsWith(
          `pages/${String(book.storyPages.findIndex((candidate) => candidate.id === pageId) + 1).padStart(2, '0')}-story/`,
        ))
    ) {
      const fileName = path.slice(path.lastIndexOf('/') + 1);
      files.push({ path: `${folder}/${fileName}`, blob: image.blob });
    }
  }
  return files;
}
