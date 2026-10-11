// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTOSAVE_DEBOUNCE_MS } from './timing';

export type SavedStatus = 'idle' | 'saving' | 'saved' | 'failed';

export interface AutosaveOptions {
  debounceMs?: number;
  enabled?: boolean;
}

export interface AutosaveResult {
  status: SavedStatus;
  lastSavedAt: string | null;
  error: unknown;
  flush: () => Promise<void>;
}

export function useAutosave<T>(
  value: T,
  saveFn: (value: T) => Promise<void>,
  options: AutosaveOptions = {},
): AutosaveResult {
  const { debounceMs = AUTOSAVE_DEBOUNCE_MS, enabled = true } = options;
  const [status, setStatus] = useState<SavedStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const valueRef = useRef(value);
  const saveFnRef = useRef(saveFn);
  const lastValueRef = useRef(value);
  const wasEnabledRef = useRef(enabled);
  const dirtyRef = useRef(false);
  const sequenceRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  valueRef.current = value;
  saveFnRef.current = saveFn;

  const persist = useCallback(async (snapshot: T) => {
    const sequence = ++sequenceRef.current;
    dirtyRef.current = true;
    setStatus('saving');
    setError(null);

    const previous = inFlightRef.current?.catch(() => undefined) ?? Promise.resolve();
    const pending = previous.then(() => saveFnRef.current(snapshot));
    inFlightRef.current = pending;
    try {
      await pending;
      if (sequence === sequenceRef.current) {
        dirtyRef.current = false;
        setStatus('saved');
        setLastSavedAt(new Date().toISOString());
      }
    } catch (saveError) {
      if (sequence === sequenceRef.current) {
        dirtyRef.current = true;
        setStatus('failed');
        setError(saveError);
      }
    } finally {
      if (inFlightRef.current === pending) inFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      lastValueRef.current = value;
      wasEnabledRef.current = false;
      return;
    }
    if (!wasEnabledRef.current) {
      lastValueRef.current = value;
      wasEnabledRef.current = true;
      return;
    }
    if (Object.is(lastValueRef.current, value)) return;

    lastValueRef.current = value;
    dirtyRef.current = true;
    setStatus('saving');
    setError(null);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void persist(valueRef.current);
    }, debounceMs);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [debounceMs, enabled, persist, value]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (dirtyRef.current) void persist(valueRef.current);
      }
    },
    [persist],
  );

  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (dirtyRef.current) {
      await persist(valueRef.current);
      return;
    }
    await inFlightRef.current;
  }, [persist]);

  return { status, lastSavedAt, error, flush };
}
