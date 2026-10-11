// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { IllustrationState } from '@/domain/page';
import { getImageModel } from '@/ai/modelCatalog';
import { MAX_AI_PHOTOS_INTRO, MAX_AI_PHOTOS_PAGE } from '@/domain/constants';
import { GenerateButton } from './GenerateButton';
import { GeneratedImage } from './GeneratedImage';
import { RetryPanel } from './RetryPanel';
import { VersionHistoryStrip } from './VersionHistoryStrip';

export function IllustrationSection({
  book,
  pageId,
  illustration,
  modelId,
  busy,
  disabled,
  onGenerate,
  onRestore,
  onUpload,
  onCustomPromptChange,
  onEditModeChange,
}: {
  book: Book;
  pageId: string;
  illustration: IllustrationState;
  modelId: string;
  busy: boolean;
  disabled: boolean;
  onGenerate: () => void;
  onRestore: (imageId: string) => void;
  onUpload: (file: File) => void;
  onCustomPromptChange: (value: string) => void;
  onEditModeChange: (value: boolean) => void;
}) {
  const model = getImageModel(modelId);
  const extraPhotos =
    Math.max(0, book.intro.photos.length - MAX_AI_PHOTOS_INTRO) +
    Math.max(
      0,
      (book.storyPages.find((page) => page.id === pageId)?.photos.length ?? 0) -
        MAX_AI_PHOTOS_PAGE,
    );
  return (
    <section aria-labelledby="illustration-heading" className="page-editor__section">
      <h3 id="illustration-heading">Illustration</h3>
      {illustration.currentImageId ? (
        <GeneratedImage alt="Current story illustration" imageId={illustration.currentImageId} />
      ) : (
        <p>No illustration yet.</p>
      )}
      {extraPhotos > 0 && (
        <p className="field__hint" role="status">
          {extraPhotos} photo{extraPhotos === 1 ? ' is' : 's are'} above the Gemini request limit
          and will not be sent.
        </p>
      )}
      <RetryPanel
        customPrompt={illustration.customPrompt}
        editSupported={model?.supportsEdit ?? false}
        onCustomPromptChange={onCustomPromptChange}
        onEditModeChange={onEditModeChange}
        useEditMode={illustration.useEditMode}
      />
      <GenerateButton
        busy={busy}
        disabled={disabled}
        label={illustration.currentImageId ? 'Retry illustration' : 'Generate illustration'}
        onClick={onGenerate}
      />
      <label className="field">
        <span>Or upload your own illustration</span>
        <input
          accept="image/*"
          disabled={busy || disabled}
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (file) onUpload(file);
            input.value = '';
          }}
          type="file"
        />
      </label>
      <VersionHistoryStrip busy={busy} history={illustration.history} onRestore={onRestore} />
    </section>
  );
}
