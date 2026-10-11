// bisiyata dishmaya, leharbot ahava biyisral
import { Button } from '@/ui/Button';
import { SlidersIcon } from '@/ui/icons';
import { Tooltip } from '@/ui/Tooltip';

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
}) {
  const unavailable = (label: string, phase: number) => (
    <Tooltip content={`Available in Phase ${phase}`}>
      <span>
        <Button disabled title={`${label} — available in Phase ${phase}`} variant="secondary">
          {label}
        </Button>
      </span>
    </Tooltip>
  );
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
      {unavailable('Download all / backup', 11)}
      {unavailable('Generate', 9)}
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
