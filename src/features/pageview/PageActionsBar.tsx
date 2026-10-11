// bisiyata dishmaya, leharbot ahava biyisral
import { Button } from '@/ui/Button';

const actions = [
  ['Generate / Retry', 'Available in Phase 9'],
  ['Make colouring page', 'Available in Phase 9'],
  ['Download page files', 'Available in Phase 11'],
  ['Print page', 'Available in Phase 7'],
] as const;

export function PageActionsBar() {
  return (
    <div aria-label="Page actions" className="page-actions">
      {actions.map(([label, phase]) => (
        <Button disabled key={label} title={phase} type="button" variant="secondary">
          {label}
        </Button>
      ))}
    </div>
  );
}
