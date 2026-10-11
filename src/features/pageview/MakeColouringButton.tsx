// bisiyata dishmaya, leharbot ahava biyisral
import { Button } from '@/ui/Button';
import { Tooltip } from '@/ui/Tooltip';

export function MakeColouringButton({
  hasIllustration,
  busy,
  disabled = false,
  onClick,
}: {
  hasIllustration: boolean;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const reason = 'Generate an illustration first.';
  return (
    <Tooltip content={hasIllustration ? 'Uses the current illustration only.' : reason}>
      <span>
        <Button
          disabled={!hasIllustration || disabled || busy}
          onClick={onClick}
          title={!hasIllustration ? reason : undefined}
          type="button"
          variant="secondary"
        >
          {busy ? 'Generating…' : 'Make colouring page'}
        </Button>
      </span>
    </Tooltip>
  );
}
