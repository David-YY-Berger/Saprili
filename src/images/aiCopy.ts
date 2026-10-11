// bisiyata dishmaya, leharbot ahava biyisral
import type { PhotoRef } from '@/domain/page';

export interface AiPhotoSelection {
  used: PhotoRef[];
  flaggedExtra: PhotoRef[];
}

export function getAiPhotoSelection(
  page: { photos: readonly PhotoRef[] },
  cap: number,
): AiPhotoSelection {
  const limit = Number.isFinite(cap) ? Math.max(0, Math.floor(cap)) : 0;
  return {
    used: page.photos.slice(0, limit),
    flaggedExtra: page.photos.slice(limit),
  };
}
