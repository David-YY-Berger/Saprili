// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import { imageRepository } from '@/storage/repositories';

export function useFullImage(imageId: string | null): {
  url: string | null;
  loading: boolean;
  error: unknown;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    void imageRepository
      .getImage(imageId)
      .then((image) => {
        if (!image) throw new Error(`Image ${imageId} was not found`);
        if (!active) return;
        objectUrl = URL.createObjectURL(image.blob);
        setUrl(objectUrl);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [imageId]);

  return { url, loading, error };
}
