// bisiyata dishmaya, leharbot ahava biyisral

/**
 * Session storage outlives an idle service worker but is cleared when the browser or extension
 * restarts. Returns whether the flag was already set, then sets it.
 */
export async function claimSessionFlag(key: string): Promise<boolean> {
  const alreadySet = (await chrome.storage.session.get(key))[key] === true;
  await chrome.storage.session.set({ [key]: true });
  return alreadySet;
}
