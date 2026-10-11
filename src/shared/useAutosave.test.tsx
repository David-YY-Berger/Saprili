// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './useAutosave';

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutosave', () => {
  it('debounces changes and reports saving then saved', async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(({ value }) => useAutosave(value, save), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });
    expect(result.current.status).toBe('saving');
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith('second');
    expect(result.current.status).toBe('saved');
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  it('reports a failed save and retries when flushed', async () => {
    vi.useFakeTimers();
    const save = vi
      .fn<(_: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Storage unavailable'))
      .mockResolvedValueOnce(undefined);
    const { result, rerender } = renderHook(({ value }) => useAutosave(value, save), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'changed' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBeInstanceOf(Error);

    await act(async () => {
      await result.current.flush();
    });
    expect(result.current.status).toBe('saved');
    expect(save).toHaveBeenCalledTimes(2);
  });
});
