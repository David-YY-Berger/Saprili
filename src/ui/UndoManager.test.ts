// bisiyata dishmaya, leharbot ahava biyisral
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UNDO_WINDOW_MS } from '@/domain/constants';
import { UndoManager } from './UndoManager';

afterEach(() => {
  vi.useRealTimers();
});

describe('UndoManager', () => {
  it('runs undo and cancels the expiry action', async () => {
    vi.useFakeTimers();
    const manager = new UndoManager();
    const undo = vi.fn();
    const onExpire = vi.fn();
    const id = manager.registerUndo({ label: 'Delete book', undo, onExpire });

    await manager.undo(id);
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);

    expect(undo).toHaveBeenCalledOnce();
    expect(onExpire).not.toHaveBeenCalled();
    expect(manager.getSnapshot()).toEqual([]);
  });

  it('runs expiry and keeps failures available for retry', async () => {
    vi.useFakeTimers();
    const manager = new UndoManager();
    const onExpire = vi.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValueOnce(undefined);
    const id = manager.registerUndo({ label: 'Delete book', undo: vi.fn(), onExpire });

    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    expect(manager.getSnapshot()[0]?.error).toBeInstanceOf(Error);

    await manager.retry(id);
    expect(onExpire).toHaveBeenCalledTimes(2);
    expect(manager.getSnapshot()).toEqual([]);
  });
});
