// bisiyata dishmaya, leharbot ahava biyisral
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppError } from '@/shared/errors';
import { getStorage, imageRepository, setStorageForTests } from '@/storage/repositories';
import { createTestStorage } from '@/storage/testing';
import { PhotoImportService } from './importPhoto';

function bitmap(width: number, height: number) {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

beforeEach(() => {
  setStorageForTests(createTestStorage());
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap(3000, 2000)));
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        readonly width: number,
        readonly height: number,
      ) {}

      getContext() {
        return { drawImage: vi.fn() };
      }

      async convertToBlob(options: { type: string }) {
        return new Blob(['encoded'], { type: options.type });
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  setStorageForTests(null);
});

describe('PhotoImportService', () => {
  it('stores the original, AI copy, and thumbnail at their target sizes', async () => {
    const service = new PhotoImportService();
    const refs = await service.importFiles('book-photo-test', [
      new File(['source'], 'family.jpg', { type: 'image/jpeg' }),
    ]);

    expect(refs).toHaveLength(1);
    const rawOriginal = await getStorage().get('images', refs[0]!.originalImageId);
    expect(rawOriginal).toMatchObject({ id: refs[0]!.originalImageId });
    expect((rawOriginal as { blob: unknown }).blob).toBeInstanceOf(Blob);
    const [original, aiCopy, thumbnail] = await Promise.all([
      imageRepository.getImage(refs[0]!.originalImageId),
      imageRepository.getImage(refs[0]!.aiCopyImageId),
      imageRepository.getThumb(refs[0]!.originalImageId),
    ]);
    expect(original).toMatchObject({ kind: 'original', widthPx: 2000, heightPx: 1333 });
    expect(aiCopy).toMatchObject({ kind: 'aiCopy', widthPx: 1024, heightPx: 683 });
    expect(thumbnail?.widthPx).toBe(256);
    expect(await imageRepository.listImageIdsForBook('book-photo-test')).toHaveLength(2);
  });

  it('does not persist a partial import when a later image cannot be decoded', async () => {
    vi.mocked(createImageBitmap).mockImplementation((source: ImageBitmapSource) =>
      source instanceof File && source.name === 'second.heic'
        ? Promise.reject(new Error('unsupported HEIC'))
        : Promise.resolve(bitmap(3000, 2000)),
    );
    const service = new PhotoImportService();

    await expect(
      service.importFiles('book-photo-test', [
        new File(['first'], 'first.jpg', { type: 'image/jpeg' }),
        new File(['second'], 'second.heic', { type: 'image/heic' }),
      ]),
    ).rejects.toMatchObject({ code: 'IMAGE_DECODE_FAILED' } satisfies Partial<AppError>);
    expect(await imageRepository.listImageIdsForBook('book-photo-test')).toEqual([]);
  });
});
