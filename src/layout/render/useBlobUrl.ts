// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useMemo, useState } from 'react';
import { imageRepository } from '@/storage/repositories';

/** Image id to ready-to-use URL. Print passes a fully resolved map so rendering stays synchronous. */
export type ResolvedImages = ReadonlyMap<string, string>;

/**
 * Object URLs for the given images (screen use). Anything already in `resolved`
 * is used as is; the rest is loaded from storage and revoked on cleanup.
 */
export function useBlobUrls(
  imageIds: readonly string[],
  resolved?: ResolvedImages,
): ResolvedImages {
  const key = imageIds.join('|');
  const [loaded, setLoaded] = useState<ReadonlyMap<string, string>>(new Map());

  useEffect(() => {
    const missing = imageIds.filter((id) => !resolved?.has(id));
    if (missing.length === 0) {
      setLoaded(new Map());
      return;
    }
    let cancelled = false;
    const created: string[] = [];
    void Promise.all(
      missing.map(async (id) => {
        const record = await imageRepository.getImage(id).catch(() => null);
        if (!record || cancelled) return null;
        const url = URL.createObjectURL(record.blob);
        created.push(url);
        return [id, url] as const;
      }),
    ).then((entries) => {
      if (cancelled) {
        created.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      setLoaded(new Map(entries.filter((e): e is readonly [string, string] => e !== null)));
    });
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
    // `key` stands for the id list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, resolved]);

  return useMemo(() => new Map([...loaded, ...(resolved ?? [])]), [loaded, resolved]);
}

export function useBlobUrl(imageId: string | null, resolved?: ResolvedImages): string | null {
  const ids = useMemo(() => (imageId ? [imageId] : []), [imageId]);
  const urls = useBlobUrls(ids, resolved);
  return imageId ? (urls.get(imageId) ?? null) : null;
}
