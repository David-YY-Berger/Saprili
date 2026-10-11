// bisiyata dishmaya, leharbot ahava biyisral
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { formatBytes, StorageUsage } from './StorageUsage';

afterEach(cleanup);

describe('StorageUsage', () => {
  it('formats byte thresholds clearly', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 ** 2)).toBe('1.0 MB');
  });

  it('explains when the browser cannot report usage', async () => {
    render(<StorageUsage />);
    expect(await screen.findByText('Storage usage is unavailable in this browser.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
