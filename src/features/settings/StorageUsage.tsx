// bisiyata dishmaya, leharbot ahava biyisral
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/ui/Button';

interface UsageState {
  usage: number;
  quota?: number;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function StorageUsage() {
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const estimate = await navigator.storage?.estimate();
      if (typeof estimate?.usage !== 'number') {
        setError(true);
      } else {
        setUsage({
          usage: estimate.usage,
          ...(typeof estimate.quota === 'number' ? { quota: estimate.quota } : {}),
        });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section aria-labelledby="storage-usage-heading" className="storage-usage">
      <h3 id="storage-usage-heading">Local storage</h3>
      {loading ? (
        <p aria-live="polite" role="status">Checking storage usage…</p>
      ) : error || !usage ? (
        <div>
          <p role="status">Storage usage is unavailable in this browser.</p>
          <Button onClick={() => void refresh()} type="button" variant="secondary">
            Try again
          </Button>
        </div>
      ) : (
        <p aria-live="polite" role="status">
          Using {formatBytes(usage.usage)}
          {usage.quota !== undefined
            ? `. Estimated quota: ${formatBytes(usage.quota)}`
            : ''}
          . The browser reports an estimate.
        </p>
      )}
    </section>
  );
}
