// bisiyata dishmaya, leharbot ahava biyisral
export type ImageKind =
  | 'original'
  | 'aiCopy'
  | 'illustration'
  | 'colouring'
  | 'coverIllustration'
  | 'coverUserImage'
  | 'qr';

export interface ImageMeta {
  source: 'uploaded' | 'generated';
  modelId?: string;
  generatedAt?: string;
  /** Percentage of an image edge removed to match the book's picture shape. */
  croppedEdgePercent?: number;
}

export interface ImageRecord {
  id: string;
  bookId: string;
  kind: ImageKind;
  blob: Blob;
  mime: string;
  widthPx: number;
  heightPx: number;
  byteSize: number;
  createdAt: string;
  meta: ImageMeta;
}

export interface ThumbRecord {
  imageId: string;
  bookId: string;
  blob: Blob;
  widthPx: number;
  heightPx: number;
}

/** A thumbnail before it is tied to an image record. */
export interface ThumbPayload {
  blob: Blob;
  widthPx: number;
  heightPx: number;
}
