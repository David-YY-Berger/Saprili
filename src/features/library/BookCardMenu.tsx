// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/ui/IconButton';
import { MoreIcon } from '@/ui/icons';

export function BookCardMenu({
  bookTitle,
  onDuplicate,
  onDelete,
}: {
  bookTitle: string;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="book-menu" ref={menuRef}>
      <IconButton
        icon={<MoreIcon />}
        label={`Actions for ${bookTitle}`}
        onClick={() => setOpen((current) => !current)}
      />
      {open && (
        <div aria-label={`Actions for ${bookTitle}`} className="book-menu__panel" role="menu">
          <button
            onClick={() => {
              setOpen(false);
              onDuplicate();
            }}
            role="menuitem"
            type="button"
          >
            Duplicate book
          </button>
          <button
            data-danger="true"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            role="menuitem"
            type="button"
          >
            Delete book
          </button>
        </div>
      )}
    </div>
  );
}
