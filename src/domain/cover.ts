// bisiyata dishmaya, leharbot ahava biyisral
import type { IllustrationState } from './page';

export interface BackCover {
  note: string;
}

export type CoverArtworkMode = 'single' | 'introCollage' | 'characterPortraits';

export interface Cover {
  titleHe: string;
  subtitleHe: string;
  spineTextHe: string;
  illustration: IllustrationState;
  artworkMode: CoverArtworkMode;
  characterPortraits: { characterId: string; imageId: string }[];
  ownImageId: string | null;
  back: BackCover;
  colouringMarkerText: string;
}
