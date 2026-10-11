// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import type { StoryPair } from '@/domain/ordering';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';

function pairTitle(pair: StoryPair, index: number): string {
  const first = pair[0].privateTitle || `Page ${index * 2 + 1}`;
  const second = pair[1].privateTitle || `Page ${index * 2 + 2}`;
  return `Pair ${index + 1}: ${first} + ${second}`;
}

export function DeletePagesDialog({
  open,
  pairs,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pairs: StoryPair[];
  onClose: () => void;
  onConfirm: (pageIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open, pairs]);

  const canDelete = pairs.length > 1;
  return (
    <Modal open={open} onClose={onClose} title="Delete story pairs">
      <p>Select the pair or pairs to remove. You can undo this for a few seconds.</p>
      {!canDelete && <p className="field__hint">A book must keep at least one story pair.</p>}
      <fieldset className="pair-choice-list" disabled={!canDelete}>
        <legend>Pairs to delete</legend>
        {pairs.map((pair, index) => {
          const id = pair[0].id;
          const checked = selected.has(id);
          const canSelect = checked || selected.size < pairs.length - 1;
          return (
            <label className="pair-choice" key={id}>
              <input
                checked={checked}
                disabled={!canSelect}
                onChange={(event) => {
                  const isChecked = event.currentTarget.checked;
                  setSelected((current) => {
                    const next = new Set(current);
                    if (isChecked) next.add(id);
                    else next.delete(id);
                    return next;
                  });
                }}
                type="checkbox"
              />
              <span>{pairTitle(pair, index)}</span>
            </label>
          );
        })}
      </fieldset>
      <div className="modal__actions">
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button
          disabled={selected.size === 0 || !canDelete}
          onClick={() => onConfirm([...selected])}
          variant="danger"
        >
          Delete selected pairs
        </Button>
      </div>
    </Modal>
  );
}
