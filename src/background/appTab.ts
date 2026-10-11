// bisiyata dishmaya, leharbot ahava biyisral
export const APP_PAGE = 'app.html';

export interface AppTabContext {
  tabId: number;
  windowId: number;
  documentUrl?: string;
}

/** The browser calls the app tab logic needs; faked in tests. */
export interface AppTabApi {
  getAppUrl(): string;
  getTabContexts(): Promise<AppTabContext[]>;
  focusTab(tabId: number, windowId: number): Promise<void>;
  openTab(url: string): Promise<void>;
}

export function isAppUrl(url: string | undefined, appUrl: string): boolean {
  return !!url && (url === appUrl || url.startsWith(`${appUrl}#`) || url.startsWith(`${appUrl}?`));
}

export function findAppTab(
  contexts: readonly AppTabContext[],
  appUrl: string,
): AppTabContext | undefined {
  return contexts.find((c) => isAppUrl(c.documentUrl, appUrl));
}

// runtime.getContexts and tabs.update/windows.update need no "tabs" permission.
export function createChromeAppTabApi(): AppTabApi {
  return {
    getAppUrl: () => chrome.runtime.getURL(APP_PAGE),
    async getTabContexts() {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: [chrome.runtime.ContextType.TAB],
      });
      return contexts.flatMap((c) =>
        c.tabId >= 0 ? [{ tabId: c.tabId, windowId: c.windowId, documentUrl: c.documentUrl }] : [],
      );
    },
    async focusTab(tabId, windowId) {
      await chrome.windows.update(windowId, { focused: true });
      await chrome.tabs.update(tabId, { active: true });
    },
    async openTab(url) {
      await chrome.tabs.create({ url });
    },
  };
}

export async function focusOrOpenAppTab(api: AppTabApi = createChromeAppTabApi()): Promise<void> {
  const appUrl = api.getAppUrl();
  const existing = findAppTab(await api.getTabContexts(), appUrl);
  if (existing) await api.focusTab(existing.tabId, existing.windowId);
  else await api.openTab(appUrl);
}

let queue: Promise<void> = Promise.resolve();

export function registerActionClickHandler(): void {
  chrome.action.onClicked.addListener(() => {
    // Serialised so rapid clicks cannot open two tabs.
    queue = queue.then(() => focusOrOpenAppTab()).catch((error) => console.error(error));
  });
}
