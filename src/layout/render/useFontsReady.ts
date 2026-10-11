// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useState } from 'react';
import { ensureFontsLoaded } from '../fontRegistry';

/** Returns a counter that changes once the fonts have loaded, so text can be measured again. */
export function useFontsReady(fontIds: readonly string[]): number {
  const [readyCount, setReadyCount] = useState(0);
  const key = fontIds.join('|');
  useEffect(() => {
    let cancelled = false;
    void ensureFontsLoaded(fontIds).then(() => {
      if (!cancelled) setReadyCount((c) => c + 1);
    });
    return () => {
      cancelled = true;
    };
    // `key` stands for the id list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return readyCount;
}
