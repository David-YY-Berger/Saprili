// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import { imageRepository } from '@/storage/repositories';

export function useThumb(imageId: string | null): { url: string | null; error: unknown } {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(null);
    if (!imageId) return;
    void imageRepository
      .getThumb(imageId)
      .then((thumb) => {
        if (!thumb) throw new Error(`Thumbnail for image ${imageId} was not found`);
        if (!active) return;
        objectUrl = URL.createObjectURL(thumb.blob);
        setUrl(objectUrl);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);
  return { url, error };
}
