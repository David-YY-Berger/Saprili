// bisiyata dishmaya, leharbot ahava biyisral
import type { IllustrationHistoryEntry } from '@/domain/page';
import { GeneratedImage } from './GeneratedImage';

export function VersionHistoryStrip({
  history,
  busy,
  onRestore,
}: {
  history: readonly IllustrationHistoryEntry[];
  busy: boolean;
  onRestore: (imageId: string) => void;
}) {
  if (history.length === 0) return null;
  return (
    <div aria-label="Previous illustration versions" className="version-history">
      <h4>Previous versions</h4>
      {history.map((entry) => (
        <div className="version-history__item" key={entry.imageId}>
          <GeneratedImage alt="Previous illustration version" imageId={entry.imageId} />
          <time dateTime={entry.replacedAt}>{new Date(entry.replacedAt).toLocaleDateString()}</time>
          <button
            disabled={busy}
            onClick={() => onRestore(entry.imageId)}
            type="button"
          >
            Restore
          </button>
        </div>
      ))}
    </div>
  );
}
