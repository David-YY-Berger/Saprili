// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect } from 'react';

export function usePasteImages(onFiles: (files: File[]) => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (files.length > 0) {
        event.preventDefault();
        onFiles(files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [enabled, onFiles]);
}
