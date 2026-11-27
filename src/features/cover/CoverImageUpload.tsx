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
  multiple = false,
  disabled = false,
  onBusyChange,
  label = 'Use own image',
  hint = 'The image is shown whole, inside the cover frame; it is never cropped.',
}: {
  bookId: string;
  onUploaded: (imageIds: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  label?: string;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const upload = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    const uploaded: string[] = [];
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error('Choose an image file for the cover.');
        }
        const bitmap = await createImageBitmap(file);
        try {
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
          uploaded.push(record.id);
        } finally {
          bitmap.close();
        }
      }
    } catch (uploadError) {
      setError(uploadError);
    } finally {
      if (uploaded.length > 0) onUploaded(uploaded);
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  return (
    <label className="field">
      <span>{label}</span>
      <input
        accept="image/*"
        disabled={busy || disabled}
        multiple={multiple}
        onChange={(event) => {
          const input = event.currentTarget;
          void upload(Array.from(input.files ?? [])).then(() => {
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
