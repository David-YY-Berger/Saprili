// bisiyata dishmaya, leharbot ahava biyisral
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';

export function RestoreConflictDialog({
  open,
  title,
  onCopy,
  onReplace,
  onCancel,
}: {
  open: boolean;
  title: string;
  onCopy: () => void;
  onReplace: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title="A book with this backup’s id already exists">
      <p>
        “{title}” is already in your library. Restore the backup as a separate copy, or replace the
        existing book and its saved pictures.
      </p>
      <div className="modal__actions">
        <Button onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button onClick={onCopy} variant="secondary">
          Restore as a new copy
        </Button>
        <Button onClick={onReplace} variant="danger">
          Replace existing book
        </Button>
      </div>
    </Modal>
  );
}
