// bisiyata dishmaya, leharbot ahava biyisral
import { useRef, useState } from 'react';
import { Button } from '@/ui/Button';

export function PhotoDropZone({
  onFiles,
  disabled = false,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const addFiles = (files: FileList | File[]) => {
    const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (images.length > 0) onFiles(images);
  };

  return (
    <div
      className={`photo-drop-zone${dragging ? ' photo-drop-zone--active' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) addFiles(event.dataTransfer.files);
      }}
    >
      <input
        accept="image/*"
        className="visually-hidden"
        disabled={disabled}
        multiple
        onChange={(event) => {
          if (event.currentTarget.files) addFiles(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
        ref={inputRef}
        type="file"
      />
      <span>Drop pictures here, or </span>
      <Button
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        type="button"
        variant="secondary"
      >
        Choose pictures
      </Button>
      <span className="field__hint">JPEG, PNG, WebP, or another browser-supported image format.</span>
    </div>
  );
}
