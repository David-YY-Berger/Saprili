// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it } from 'vitest';
import { AppError } from '@/shared/errors';
import { KEEP_ALIVE_INTERVAL_MS, KeepAlive } from './KeepAlive';
import { backoffMs, isFatalStop, MAX_JOB_ATTEMPTS, shouldRetry } from './RetryPolicy';

describe('RetryPolicy', () => {
  it('stops the batch only for key and quota problems', () => {
    expect(isFatalStop(new AppError('AI_AUTH'))).toBe(true);
    expect(isFatalStop(new AppError('AI_QUOTA'))).toBe(true);
    expect(isFatalStop(new AppError('AI_NO_KEY'))).toBe(true);
    expect(isFatalStop(new AppError('AI_REFUSED'))).toBe(false);
    expect(isFatalStop(new AppError('AI_TEMPORARY'))).toBe(false);
  });

  it('retries only temporary errors, up to the attempt limit, with growing backoff', () => {
    const temporary = new AppError('AI_TEMPORARY');
    expect(shouldRetry(temporary, 1)).toBe(true);
    expect(shouldRetry(temporary, MAX_JOB_ATTEMPTS)).toBe(false);
    expect(shouldRetry(new AppError('AI_REFUSED'), 1)).toBe(false);
    expect(shouldRetry(new AppError('AI_BAD_RESPONSE'), 1)).toBe(false);
    expect(backoffMs(2)).toBeGreaterThan(backoffMs(1));
  });
});

describe('KeepAlive', () => {
  it('pings now and on an interval only while started, and survives a failing ping', () => {
    let pings = 0;
    let tick: (() => void) | null = null;
    let interval = 0;
    const keepAlive = new KeepAlive({
      ping: () => {
        pings += 1;
        throw new Error('unavailable');
      },
      setInterval: (callback, ms) => {
        tick = callback;
        interval = ms;
        return 1;
      },
      clearInterval: () => {
        tick = null;
      },
    });
    keepAlive.start();
    keepAlive.start();
    expect(pings).toBe(1);
    expect(interval).toBe(KEEP_ALIVE_INTERVAL_MS);
    expect(interval).toBeLessThan(30_000);
    tick!();
    expect(pings).toBe(2);
    keepAlive.stop();
    expect(keepAlive.active).toBe(false);
    expect(tick).toBeNull();
  });
});
