// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import { imageRepository } from '@/storage/repositories';
import { toAppError } from '@/shared/errors';

export function GeneratedImage({
  imageId,
  alt,
  className,
}: {
  imageId: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setError(null);
    void imageRepository
      .getImage(imageId)
      .then((record) => {
        if (!record) throw new Error('Image was not found in storage.');
        objectUrl = URL.createObjectURL(record.blob);
        if (active) setUrl(objectUrl);
      })
      .catch((loadError: unknown) => {
        if (active) setError(toAppError(loadError).userMessage);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  if (error) return <p role="alert">{error}</p>;
  if (!url) return <p role="status">Loading image…</p>;
  return <img alt={alt} className={className} src={url} />;
}
