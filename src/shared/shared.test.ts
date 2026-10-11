// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it, vi } from 'vitest';
import { debounce, TimeoutError, withTimeout } from './async';
import { fixedClock } from './clock';
import { AppError, ERROR_CODES, toAppError } from './errors';
import { cmToMm, mmToCss, mmToPx, pxToMm } from './units';
import { getDirection, t } from '@/i18n';

describe('units', () => {
  it('converts', () => {
    expect(cmToMm(20.6)).toBeCloseTo(206);
    expect(mmToPx(25.4, 300)).toBeCloseTo(300);
    expect(pxToMm(300, 300)).toBeCloseTo(25.4);
    expect(mmToCss(0.1 + 0.2)).toBe('0.3mm');
  });
});

describe('clock', () => {
  it('fixedClock can be advanced', () => {
    const clock = fixedClock('2026-01-01T00:00:00.000Z');
    clock.set('2026-02-01T00:00:00.000Z');
    expect(clock.nowIso()).toBe('2026-02-01T00:00:00.000Z');
  });
});

describe('async', () => {
  it('debounce coalesces, flushes and cancels', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d(1);
    d(2);
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledExactlyOnceWith(2);
    d(3);
    d.flush();
    expect(fn).toHaveBeenLastCalledWith(3);
    d(4);
    d.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('withTimeout rejects slow promises', async () => {
    await expect(withTimeout(new Promise(() => {}), 10)).rejects.toBeInstanceOf(TimeoutError);
    await expect(withTimeout(Promise.resolve(7), 10)).resolves.toBe(7);
  });
});

describe('errors', () => {
  it('every error code has a message and next step', () => {
    for (const code of ERROR_CODES) {
      const error = new AppError(code);
      expect(error.userMessage.length).toBeGreaterThan(0);
      expect(error.nextStep.length).toBeGreaterThan(0);
    }
  });

  it('toAppError maps quota errors and keeps AppErrors', () => {
    const quota = Object.assign(new Error('full'), { name: 'QuotaExceededError' });
    expect(toAppError(quota).code).toBe('STORAGE_QUOTA');
    expect(toAppError(new Error('boom')).code).toBe('STORAGE_FAILED');
    const original = new AppError('AI_AUTH');
    expect(toAppError(original)).toBe(original);
    expect(toAppError('x', 'IMAGE_DECODE_FAILED').code).toBe('IMAGE_DECODE_FAILED');
  });

  it('does not leak developer detail into user messages', () => {
    const error = toAppError(new Error('secret internals'));
    expect(error.userMessage).not.toContain('secret');
  });
});

describe('i18n', () => {
  it('interpolates params and reports direction', () => {
    expect(t('app.storage.ready', { count: 3 })).toContain('3');
    expect(getDirection('he')).toBe('rtl');
    expect(getDirection('en')).toBe('ltr');
  });
});
