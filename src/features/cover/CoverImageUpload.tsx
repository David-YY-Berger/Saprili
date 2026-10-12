// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import type { ImageRecord } from '@/domain/image';
import { newId } from '@/shared/ids';
import { toAppError } from '@/shared/errors';
import { imageRepository } from '@/storage/repositories';
import { createThumbnail } from '@/storage/thumbnails';
import { Banner } from '@/ui/Banner';

/** Stores the chosen file as the cover's own image and reports its id. */
export function CoverImageUpload({
  bookId,
  onUploaded,
  label = 'Use own image',
  hint = 'The image is shown whole, inside the cover frame; it is never cropped.',
}: {
  bookId: string;
  onUploaded: (imageId: string) => void;
  label?: string;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(new Error('Choose an image file for the cover.'));
      return;
    }
    setBusy(true);
    setError(null);
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      const record: ImageRecord = {
        id: newId(),
        bookId,
        kind: 'coverUserImage',
        blob: file,
        mime: file.type,
        widthPx: bitmap.width,
        heightPx: bitmap.height,
        byteSize: file.size,
        createdAt: new Date().toISOString(),
        meta: { source: 'uploaded' },
      };
      await imageRepository.putImage(record, await createThumbnail(file));
      onUploaded(record.id);
    } catch (uploadError) {
      setError(uploadError);
    } finally {
      bitmap?.close();
      setBusy(false);
    }
  };

  return (
    <label className="field">
      <span>{label}</span>
      <input
        accept="image/*"
        disabled={busy}
        onChange={(event) => {
          const input = event.currentTarget;
          void upload(input.files?.[0]).then(() => {
            input.value = '';
          });
        }}
        type="file"
      />
      <span className="field__hint">
        {hint}
      </span>
      {busy && <span role="status">Adding cover image…</span>}
      {error !== null && (
        <Banner type="error" title={toAppError(error).userMessage}>
          {toAppError(error).nextStep}
        </Banner>
      )}
    </label>
  );
}
