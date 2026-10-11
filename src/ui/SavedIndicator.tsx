// bisiyata dishmaya, leharbot ahava biyisral
import type { SavedStatus } from '@/shared/useAutosave';

const labels: Record<SavedStatus, string> = {
  idle: 'Changes are saved',
  saving: 'Saving…',
  saved: 'Saved',
  failed: 'Not saved',
};

export function SavedIndicator({ status }: { status: SavedStatus }) {
  return (
    <span
      aria-live="polite"
      className={`saved-indicator${status === 'saved' ? ' saved-indicator--saved' : ''}${status === 'failed' ? ' saved-indicator--failed' : ''}`}
      role="status"
    >
      {status === 'saving' && <span aria-hidden="true" className="spinner" />}
      {status === 'saved' && <span aria-hidden="true">✓</span>}
      {status === 'failed' && <span aria-hidden="true">!</span>}
      {labels[status]}
    </span>
  );
}
