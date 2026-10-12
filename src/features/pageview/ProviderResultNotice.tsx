// bisiyata dishmaya, leharbot ahava biyisral
import type { AppError } from '@/shared/errors';
import { Banner } from '@/ui/Banner';

export function ProviderResultNotice({
  error,
  omittedPhotoCount = 0,
  omittedReferenceLabel = 'photo',
}: {
  error: AppError | null;
  omittedPhotoCount?: number;
  omittedReferenceLabel?: string;
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
        <Banner
          type="warning"
          title={`Some ${omittedReferenceLabel}${omittedPhotoCount === 1 ? '' : 's'} were not sent`}
        >
          {omittedPhotoCount} {omittedReferenceLabel}
          {omittedPhotoCount === 1 ? ' was' : 's were'} above the provider limit and not included in
          that request.
        </Banner>
      )}
    </>
  );
}
