// bisiyata dishmaya, leharbot ahava biyisral
import { useSyncExternalStore } from 'react';
import { toAppError } from '@/shared/errors';
import { Button } from './Button';
import { undoManager } from './UndoManager';

export function UndoToast() {
  const entries = useSyncExternalStore(undoManager.subscribe, undoManager.getSnapshot);
  if (entries.length === 0) return null;
  return (
    <div aria-label="Undo actions" className="toast-region" role="region">
      {entries.map((entry) => {
        const error = entry.error === null ? null : toAppError(entry.error);
        return (
          <div className={`toast${error ? ' toast--error' : ''}`} key={entry.id}>
            <div>
              {error ? (
                <span role="alert">
                  {error.userMessage} {error.nextStep}
                </span>
              ) : (
                <span>{entry.label}</span>
              )}
            </div>
            {error ? (
              entry.errorAction === 'expire' ? (
                <>
                  <Button onClick={() => void undoManager.undo(entry.id)} variant="secondary">
                    Undo instead
                  </Button>
                  <Button onClick={() => void undoManager.retry(entry.id)} variant="secondary">
                    Retry deletion
                  </Button>
                </>
              ) : (
                <Button onClick={() => void undoManager.retry(entry.id)} variant="secondary">
                  Retry undo
                </Button>
              )
            ) : (
              <Button
                disabled={entry.expiring}
                onClick={() => void undoManager.undo(entry.id)}
                variant="secondary"
              >
                {entry.expiring ? 'Finishing…' : 'Undo'}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
