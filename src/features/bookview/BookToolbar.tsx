// bisiyata dishmaya, leharbot ahava biyisral
import type { ReactNode } from 'react';
import { Button } from '@/ui/Button';
import { SlidersIcon } from '@/ui/icons';

export function BookToolbar({
  pairCount,
  disabled,
  onAdd,
  onDelete,
  onSettings,
  onPreflight,
  onPrintBook,
  onPrintColouring,
  onPrintCover,
  onGenerate,
  backupSlot,
  generateChip,
}: {
  pairCount: number;
  disabled: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onSettings: () => void;
  onPreflight: () => void;
  onPrintBook: () => void;
  onPrintColouring: () => void;
  onPrintCover: () => void;
  onGenerate: () => void;
  backupSlot: ReactNode;
  generateChip?: ReactNode;
}) {
  return (
    <div aria-label="Book actions" className="book-toolbar">
      <Button disabled={disabled} onClick={onPrintBook} variant="secondary">
        Print book
      </Button>
      <Button disabled={disabled} onClick={onPrintColouring} variant="secondary">
        Print colouring book
      </Button>
      <Button disabled={disabled} onClick={onPrintCover} variant="secondary">
        Print cover
      </Button>
      {backupSlot}
      <Button disabled={disabled} onClick={onGenerate} variant="secondary">
        Generate
      </Button>
      {generateChip}
      <Button disabled={disabled} onClick={onPreflight} variant="secondary">
        Pre-flight
      </Button>
      <Button disabled={disabled} onClick={onAdd} variant="secondary">
        Add pages
      </Button>
      <Button disabled={disabled || pairCount <= 1} onClick={onDelete} variant="secondary">
        Delete pages
      </Button>
      <Button
        aria-label="Book settings"
        disabled={disabled}
        onClick={onSettings}
        variant="secondary"
      >
        <SlidersIcon /> Book settings
      </Button>
    </div>
  );
}
