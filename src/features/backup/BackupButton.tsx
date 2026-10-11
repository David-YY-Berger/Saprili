// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useRef, useState } from 'react';
import { toAppError } from '@/shared/errors';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/ToastHost';
import { downloadBlob, exportBookBackup, type BackupProgress } from './backupExport';
import { LastBackupBadge } from './LastBackupBadge';

export function BackupButton({
  bookId,
  lastBackupAt,
  disabled = false,
}: {
  bookId: string;
  lastBackupAt: string | null;
  disabled?: boolean;
}) {
  const [savedAt, setSavedAt] = useState(lastBackupAt);
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  const controller = useRef<AbortController | null>(null);
  const { showToast } = useToast();

  useEffect(() => setSavedAt(lastBackupAt), [lastBackupAt]);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  const start = async () => {
    const active = new AbortController();
    controller.current = active;
    setProgress({ completedFiles: 0, totalFiles: 0, completedBytes: 0, totalBytes: 0 });
    try {
      const blob = await exportBookBackup(bookId, setProgress, active.signal);
      if (active.signal.aborted) return;
      const timestamp = new Date().toISOString();
      setSavedAt(timestamp);
      downloadBlob(blob, `saprili-${bookId}-backup.zip`);
      showToast('Backup downloaded. Keep the ZIP file somewhere safe.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const appError = toAppError(error);
      showToast(`${appError.userMessage} ${appError.nextStep}`, 'error');
    } finally {
      if (controller.current === active) controller.current = null;
      setProgress(null);
    }
  };

  return (
    <span className="backup-control">
      <Button disabled={disabled || progress !== null} onClick={() => void start()} variant="secondary">
        Download all / backup
      </Button>
      <LastBackupBadge lastBackupAt={savedAt} />
      {progress && (
        <span aria-live="polite" className="backup-progress" role="status">
          {progress.totalFiles === 0
            ? 'Preparing backup…'
            : `Adding ${progress.completedFiles} of ${progress.totalFiles} files`}
          <Button onClick={() => controller.current?.abort()} variant="secondary">
            Cancel
          </Button>
        </span>
      )}
    </span>
  );
}
