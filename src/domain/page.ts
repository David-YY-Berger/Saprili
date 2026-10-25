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

/** A main character: the profile picture and description are what the AI is given. */
export interface Character {
  id: string;
  name: string;
  description: string;
  photo: PhotoRef | null;
}

export interface IntroPage {
  id: string;
  privateTitle: string;
  textEn: string;
  textHe: string;
  photos: PhotoRef[];
  photoLayout: IntroPhotoLayout;
  characters: Character[];
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

/** The page's main picture: its illustration, else its only original photo (when AI illustration is skipped). */
export function getMainImageId(page: Pick<StoryPage, 'illustration' | 'photos'>): string | null {
  if (page.illustration.currentImageId) return page.illustration.currentImageId;
  return page.photos.length === 1 ? (page.photos[0]?.originalImageId ?? null) : null;
}
