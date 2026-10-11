// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';

export function AddPagesDialog({
  open,
  pairCount,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pairCount: number;
  onClose: () => void;
  onConfirm: (count: number, atPairIndex: number) => void;
}) {
  const [count, setCount] = useState('1');
  const [position, setPosition] = useState(String(pairCount));
  const parsedCount = Number(count);
  useEffect(() => {
    if (open) {
      setCount('1');
      setPosition(String(pairCount));
    }
  }, [open, pairCount]);
  return (
    <Modal open={open} onClose={onClose} title="Add story pages">
      <div className="settings-form">
        <div className="field">
          <label htmlFor="pair-count">Number of pairs</label>
          <input
            id="pair-count"
            min="1"
            onChange={(event) => setCount(event.currentTarget.value)}
            type="number"
            value={count}
          />
        </div>
        <div className="field">
          <label htmlFor="pair-position">Where should they go?</label>
          <select
            id="pair-position"
            onChange={(event) => setPosition(event.currentTarget.value)}
            value={position}
          >
            {Array.from({ length: pairCount + 1 }, (_, index) => (
              <option key={index} value={index}>
                {index === pairCount
                  ? 'At the end'
                  : index === 0
                    ? 'Before Pair 1'
                    : `Between Pair ${index} and Pair ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
        <div className="modal__actions">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!Number.isInteger(parsedCount) || parsedCount < 1}
            onClick={() => onConfirm(parsedCount, Number(position))}
          >
            Add pairs
          </Button>
        </div>
      </div>
    </Modal>
  );
}
