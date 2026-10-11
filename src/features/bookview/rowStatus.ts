// bisiyata dishmaya, leharbot ahava biyisral
import type { IntroPage, StoryPage } from '@/domain/page';

export interface RowStatus {
  hasEnglish: boolean;
  hasHebrew: boolean;
  photoCount: number;
  hasIllustration: boolean;
  hasColouring: boolean;
  colouringOutdated: boolean;
}

export function getRowStatus(page: IntroPage | StoryPage): RowStatus {
  const isStory = 'illustration' in page;
  return {
    hasEnglish: page.textEn.trim().length > 0,
    hasHebrew: page.textHe.trim().length > 0,
    photoCount: page.photos.length,
    hasIllustration: isStory && page.illustration.currentImageId !== null,
    hasColouring: isStory && page.colouring.imageId !== null,
    colouringOutdated: isStory && page.colouring.outdated,
  };
}
