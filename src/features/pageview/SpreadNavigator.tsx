// bisiyata dishmaya, leharbot ahava biyisral
import { Button } from '@/ui/Button';

export function SpreadNavigator({
  index,
  count,
  onChange,
  bindingSide,
}: {
  index: number;
  count: number;
  onChange: (index: number) => void;
  bindingSide: 'left' | 'right';
}) {
  return (
    <nav aria-label="Spread navigation" className="spread-navigator">
      <Button
        disabled={bindingSide === 'right' ? index >= count - 1 : index === 0}
        onClick={() => onChange(index + (bindingSide === 'right' ? 1 : -1))}
        type="button"
        variant="secondary"
      >
        {bindingSide === 'right' ? 'Next spread ←' : '← Previous spread'}
      </Button>
      <span aria-live="polite">Spread {index + 1} of {count}</span>
      <Button
        disabled={bindingSide === 'right' ? index === 0 : index >= count - 1}
        onClick={() => onChange(index + (bindingSide === 'right' ? -1 : 1))}
        type="button"
        variant="secondary"
      >
        {bindingSide === 'right' ? '← Previous spread' : 'Next spread →'}
      </Button>
    </nav>
  );
}
