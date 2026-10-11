// bisiyata dishmaya, leharbot ahava biyisral
export interface KeepAliveDeps {
  /** Any extension API call resets Chrome's idle timer for the service worker. */
  ping: () => unknown;
  setInterval: (callback: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
}

// Recipe (unverified until P10.6): while work is queued or running, call a cheap extension API
// well inside Chrome's 30 s idle limit. In-flight provider requests also keep the worker alive.
export const KEEP_ALIVE_INTERVAL_MS = 20_000;

const defaultDeps = (): KeepAliveDeps => ({
  ping: () => chrome.runtime.getPlatformInfo(),
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) => globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
});

export type KeepAliveLike = Pick<KeepAlive, 'start' | 'stop'>;

export class KeepAlive {
  private handle: unknown = null;
  private readonly deps: KeepAliveDeps;

  constructor(deps: KeepAliveDeps = defaultDeps()) {
    this.deps = deps;
  }

  get active(): boolean {
    return this.handle !== null;
  }

  start(): void {
    if (this.handle !== null) return;
    this.tick();
    this.handle = this.deps.setInterval(() => this.tick(), KEEP_ALIVE_INTERVAL_MS);
  }

  stop(): void {
    if (this.handle === null) return;
    this.deps.clearInterval(this.handle);
    this.handle = null;
  }

  private tick(): void {
    try {
      void Promise.resolve(this.deps.ping()).catch(() => undefined);
    } catch {
      // A failed ping must never stop the queue.
    }
  }
}

/** For the in-tab host, where the page itself stays alive. */
export const noKeepAlive: KeepAliveLike = { start: () => undefined, stop: () => undefined };
