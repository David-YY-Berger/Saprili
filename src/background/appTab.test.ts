// bisiyata dishmaya, leharbot ahava biyisral
import { describe, expect, it, vi } from 'vitest';
import { findAppTab, focusOrOpenAppTab, isAppUrl, type AppTabApi } from './appTab';

const APP = 'chrome-extension://abc/app.html';

function fakeApi(contexts: Awaited<ReturnType<AppTabApi['getTabContexts']>>) {
  return {
    getAppUrl: () => APP,
    getTabContexts: async () => contexts,
    focusTab: vi.fn(async () => {}),
    openTab: vi.fn(async () => {}),
  } satisfies AppTabApi;
}

describe('app tab', () => {
  it('matches the app url with hash or query only', () => {
    expect(isAppUrl(APP, APP)).toBe(true);
    expect(isAppUrl(`${APP}#/book/1`, APP)).toBe(true);
    expect(isAppUrl('chrome-extension://abc/print.html', APP)).toBe(false);
    expect(isAppUrl(`${APP}x`, APP)).toBe(false);
    expect(isAppUrl(undefined, APP)).toBe(false);
  });

  it('opens a tab when none exists', async () => {
    const api = fakeApi([
      { tabId: 1, windowId: 1, documentUrl: 'chrome-extension://abc/print.html' },
    ]);
    await focusOrOpenAppTab(api);
    expect(api.openTab).toHaveBeenCalledWith(APP);
    expect(api.focusTab).not.toHaveBeenCalled();
  });

  it('focuses the existing tab instead of opening another', async () => {
    const contexts = [{ tabId: 7, windowId: 3, documentUrl: `${APP}#/settings` }];
    const api = fakeApi(contexts);
    await focusOrOpenAppTab(api);
    expect(findAppTab(contexts, APP)?.tabId).toBe(7);
    expect(api.focusTab).toHaveBeenCalledWith(7, 3);
    expect(api.openTab).not.toHaveBeenCalled();
  });
});
