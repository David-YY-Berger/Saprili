// bisiyata dishmaya, leharbot ahava biyisral
import { toAppError } from '@/shared/errors';
import { Button } from './Button';
import { Banner } from './Banner';

export function SaveErrorBanner({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const appError = toAppError(error);
  return (
    <Banner type="error" title={appError.userMessage}>
      {appError.nextStep}{' '}
      <Button onClick={onRetry} variant="secondary">
        Retry save
      </Button>
    </Banner>
  );
}
