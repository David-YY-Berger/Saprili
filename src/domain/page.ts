// bisiyata dishmaya, leharbot ahava biyisral
export type PageKind = 'intro' | 'story' | 'colophon';

export interface PageRef {
  kind: PageKind;
  id: string;
}

export interface PhotoRef {
  originalImageId: string;
  aiCopyImageId: string;
}

export type IntroPhotoLayout = 'firstLarge' | 'collage';

export interface IllustrationHistoryEntry {
  imageId: string;
  replacedAt: string;
}

/** Also used by Cover.illustration. */
export interface IllustrationState {
  currentImageId: string | null;
  history: IllustrationHistoryEntry[];
  customPrompt: string;
  useEditMode: boolean;
}

export interface ColouringState {
  imageId: string | null;
  sourceIllustrationImageId: string | null;
  outdated: boolean;
}

export interface IntroPage {
  id: string;
  privateTitle: string;
  textEn: string;
  textHe: string;
  photos: PhotoRef[];
  photoLayout: IntroPhotoLayout;
}

export interface StoryPage {
  id: string;
  privateTitle: string;
  textEn: string;
  textHe: string;
  photos: PhotoRef[];
  illustration: IllustrationState;
  colouring: ColouringState;
}
