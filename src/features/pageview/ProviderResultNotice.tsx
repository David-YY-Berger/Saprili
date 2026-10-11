// bisiyata dishmaya, leharbot ahava biyisral
import type { AppError } from '@/shared/errors';
import { Banner } from '@/ui/Banner';

export function ProviderResultNotice({
  error,
  omittedPhotoCount = 0,
}: {
  error: AppError | null;
  omittedPhotoCount?: number;
}) {
  return (
    <>
      {error && (
        <Banner type={error.code === 'AI_REFUSED' ? 'warning' : 'error'} title={error.userMessage}>
          {error.nextStep}
          {error.code === 'AI_NO_KEY' && (
            <>
              {' '}
              <a href="#/settings">Open My settings.</a>
            </>
          )}
        </Banner>
      )}
      {omittedPhotoCount > 0 && (
        <Banner type="warning" title="Some photos were not sent">
          {omittedPhotoCount} photo{omittedPhotoCount === 1 ? ' was' : 's were'} above the provider
          limit and not included in that request.
        </Banner>
      )}
    </>
  );
}
