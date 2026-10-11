// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import type { PhotoRef } from '@/domain/page';
import { getAiPhotoSelection } from './aiCopy';

const photos: PhotoRef[] = Array.from({ length: 5 }, (_, index) => ({
  originalImageId: `original-${index}`,
  aiCopyImageId: `ai-${index}`,
}));

describe('getAiPhotoSelection', () => {
  it('uses the first photos up to the cap and flags the rest', () => {
    expect(getAiPhotoSelection({ photos }, 3)).toEqual({
      used: photos.slice(0, 3),
      flaggedExtra: photos.slice(3),
    });
  });

  it('does not flag photos when all fit or cap is zero', () => {
    expect(getAiPhotoSelection({ photos: photos.slice(0, 2) }, 3)).toEqual({
      used: photos.slice(0, 2),
      flaggedExtra: [],
    });
    expect(getAiPhotoSelection({ photos }, 0)).toEqual({ used: [], flaggedExtra: photos });
  });
});
