// bisiyata dishmaya, leharbot ahava biyisral
import { Button } from '@/ui/Button';

export function RecomputeShapeButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Button
      onClick={() => {
        if (
          window.confirm(
            'Recomputing the page shape changes the illustration area. Existing illustrations may no longer fit exactly. Continue?',
          )
        ) {
          onConfirm();
        }
      }}
      type="button"
      variant="secondary"
    >
      Recompute picture shape
    </Button>
  );
}
