// bisiyata dishmaya, leharbot ahava biyisral
import type { IllustrationState } from './page';

export interface BackCover {
  note: string;
  artworkMode: 'generate' | 'upload';
  referenceImageId: string | null;
  generatedImageId: string | null;
  ownImageId: string | null;
}

export type CoverArtworkMode = 'single' | 'introCollage' | 'characterPortraits';

export interface Cover {
  titleHe: string;
  subtitleHe: string;
  spineTextHe: string;
  illustration: IllustrationState;
  artworkMode: CoverArtworkMode;
  /** Book characters used by the cover illustration and character portraits. */
  characterIds: string[];
  characterPortraits: { characterId: string; imageId: string }[];
  ownImageId: string | null;
  back: BackCover;
  colouringMarkerText: string;
}
