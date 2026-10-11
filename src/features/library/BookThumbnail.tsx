// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import { imageRepository } from '@/storage/repositories';

export function BookThumbnail({ imageId, title }: { imageId: string | null; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setFailed(false);
    setUrl(null);
    if (imageId) {
      imageRepository
        .getThumb(imageId)
        .then((thumb) => {
          if (!active) return;
          if (!thumb) {
            setFailed(true);
            return;
          }
          objectUrl = URL.createObjectURL(thumb.blob);
          setUrl(objectUrl);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  return (
    <div
      aria-label={failed ? `${title} thumbnail could not be loaded` : `${title} book thumbnail`}
      className="book-thumbnail"
      role="img"
    >
      {url ? (
        <img alt="" src={url} />
      ) : (
        <span aria-hidden="true" className="book-thumbnail__placeholder">
          {failed ? '🖼️' : '📖'}
        </span>
      )}
    </div>
  );
}
