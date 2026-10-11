// bisiyata dishmaya, leharbot ahava biyisral
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { Spinner } from '@/ui/Spinner';
import type { RestoreProgress } from './backupRestore';

export function RestoreProgressDialog({
  open,
  progress,
  onCancel,
}: {
  open: boolean;
  progress: RestoreProgress | null;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title="Restoring your book">
      <p>Keep Saprili open while the backup is being checked and restored.</p>
      {progress ? (
        <p aria-live="polite" role="status">
          Restoring {progress.completedFiles} of {progress.totalFiles} pictures…
        </p>
      ) : (
        <Spinner label="Checking backup file" />
      )}
      <div className="modal__actions">
        <Button onClick={onCancel} variant="secondary">
          Cancel restore
        </Button>
      </div>
    </Modal>
  );
}
