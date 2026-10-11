// bisiyata dishmaya, leharbot ahava biyisral
import { useRef, useState } from 'react';
import { toAppError } from '@/shared/errors';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/ToastHost';
import {
  restoreBookBackup,
  type RestoreProgress,
  type RestoreResolution,
} from './backupRestore';
import { RestoreConflictDialog } from './RestoreConflictDialog';
import { RestoreProgressDialog } from './RestoreProgressDialog';

export function RestoreBackupButton({ onRestored }: { onRestored: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [conflictTitle, setConflictTitle] = useState<string | null>(null);
  const [progress, setProgress] = useState<RestoreProgress | null>(null);
  const { showToast } = useToast();

  const runRestore = async (targetFile: File, resolution?: RestoreResolution) => {
    const active = new AbortController();
    controller.current = active;
    setConflictTitle(null);
    setProgress(null);
    try {
      const result = await restoreBookBackup(
        targetFile,
        (next) => setProgress(next),
        { resolution, signal: active.signal },
      );
      if (active.signal.aborted) return;
      if (result.status === 'conflict') {
        setConflictTitle(result.title);
        return;
      }
      setFile(null);
      showToast(`“${result.book.title}” was restored.`);
      onRestored();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const appError = toAppError(error, 'BACKUP_INVALID');
      showToast(`${appError.userMessage} ${appError.nextStep}`, 'error');
      setFile(null);
    } finally {
      if (controller.current === active) controller.current = null;
      setProgress(null);
    }
  };

  const cancel = () => {
    controller.current?.abort();
    setProgress(null);
    setConflictTitle(null);
    setFile(null);
  };

  return (
    <>
      <input
        accept=".zip,application/zip"
        aria-label="Choose a Saprili backup ZIP file"
        className="visually-hidden"
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0] ?? null;
          event.currentTarget.value = '';
          if (!selected) return;
          setFile(selected);
          void runRestore(selected);
        }}
        ref={input}
        type="file"
      />
      <Button onClick={() => input.current?.click()} variant="secondary">
        Restore backup
      </Button>
      <RestoreProgressDialog
        onCancel={cancel}
        open={file !== null && conflictTitle === null}
        progress={progress}
      />
      <RestoreConflictDialog
        onCancel={cancel}
        onCopy={() => file && void runRestore(file, 'copy')}
        onReplace={() => file && void runRestore(file, 'replace')}
        open={conflictTitle !== null}
        title={conflictTitle ?? ''}
      />
    </>
  );
}
