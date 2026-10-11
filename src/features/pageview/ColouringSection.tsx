// bisiyata dishmaya, leharbot ahava biyisral
import type { StoryPage } from '@/domain/page';
import { MakeColouringButton } from './MakeColouringButton';
import { GeneratedImage } from './GeneratedImage';
import { OutdatedBadge } from './OutdatedBadge';

export function ColouringSection({
  page,
  busy,
  disabled,
  onGenerate,
}: {
  page: StoryPage;
  busy: boolean;
  disabled: boolean;
  onGenerate: () => void;
}) {
  return (
    <section aria-labelledby="colouring-heading" className="page-editor__section">
      <h3 id="colouring-heading">Colouring page</h3>
      {page.colouring.imageId ? (
        <>
          {page.colouring.outdated && <OutdatedBadge />}
          <GeneratedImage alt="Current colouring page" imageId={page.colouring.imageId} />
        </>
      ) : (
        <p>No colouring page yet.</p>
      )}
      <p className="field__hint">
        Uses only the current illustration. Page text and photos are not sent.
      </p>
      <MakeColouringButton
        busy={busy}
        disabled={disabled}
        hasIllustration={page.illustration.currentImageId !== null}
        onClick={onGenerate}
      />
    </section>
  );
}
