// bisiyata dishmaya, leharbot ahava biyisral
import type { IllustrationState } from './page';

export interface BackCover {
  note: string;
}

export interface Cover {
  titleHe: string;
  subtitleHe: string;
  spineTextHe: string;
  illustration: IllustrationState;
  ownImageId: string | null;
  back: BackCover;
  colouringMarkerText: string;
}
