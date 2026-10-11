// bisiyata dishmaya, leharbot ahava biyisral
import type { SavedStatus } from '@/shared/useAutosave';
import { SavedIndicator } from '@/ui/SavedIndicator';

export function SaveStatusBar({
  status,
  lastSavedAt,
}: {
  status: SavedStatus;
  lastSavedAt: string | null;
}) {
  return (
    <div className="page-save-status">
      <SavedIndicator status={status} />
      {lastSavedAt && (
        <time dateTime={lastSavedAt}>Last saved {new Date(lastSavedAt).toLocaleTimeString()}</time>
      )}
    </div>
  );
}
