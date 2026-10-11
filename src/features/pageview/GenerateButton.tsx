// bisiyata dishmaya, leharbot ahava biyisral
import { Button } from '@/ui/Button';

export function GenerateButton({
  label,
  busy,
  disabled = false,
  onClick,
}: {
  label: string;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button disabled={disabled || busy} onClick={onClick} type="button" variant="secondary">
      {busy ? 'Generating…' : label}
    </Button>
  );
}
