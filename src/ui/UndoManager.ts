// bisiyata dishmaya, leharbot ahava biyisral
import { UNDO_WINDOW_MS } from '@/domain/constants';

export interface UndoRegistration {
  label: string;
  undo: () => void | Promise<void>;
  onExpire: () => void | Promise<void>;
}

export interface UndoEntry {
  id: string;
  label: string;
  error: unknown;
  errorAction: 'undo' | 'expire' | null;
}

export class UndoManager {
  private readonly entries = new Map<
    string,
    { entry: UndoEntry; timer: ReturnType<typeof setTimeout> | null; registration: UndoRegistration }
  >();
  private listeners = new Set<() => void>();
  private nextId = 0;
  private snapshot: UndoEntry[] = [];

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): UndoEntry[] => this.snapshot;

  registerUndo(registration: UndoRegistration): string {
    const id = `undo-${++this.nextId}`;
    const record = {
      entry: { id, label: registration.label, error: null, errorAction: null } as UndoEntry,
      timer: null as ReturnType<typeof setTimeout> | null,
      registration,
    };
    this.entries.set(id, record);
    record.timer = setTimeout(() => void this.expire(id), UNDO_WINDOW_MS);
    this.publish();
    return id;
  }

  async undo(id: string): Promise<void> {
    const record = this.entries.get(id);
    if (!record) return;
    if (record.timer !== null) clearTimeout(record.timer);
    record.timer = null;
    try {
      await record.registration.undo();
      this.entries.delete(id);
      this.publish();
    } catch (error) {
      record.entry = { ...record.entry, error, errorAction: 'undo' };
      this.publish();
    }
  }

  async retry(id: string): Promise<void> {
    const record = this.entries.get(id);
    if (!record) return;
    if (record.entry.errorAction === 'undo') {
      record.entry = { ...record.entry, error: null, errorAction: null };
      this.publish();
      await this.undo(id);
      return;
    }
    await this.expire(id);
  }

  private async expire(id: string): Promise<void> {
    const record = this.entries.get(id);
    if (!record) return;
    record.timer = null;
    try {
      await record.registration.onExpire();
      this.entries.delete(id);
    } catch (error) {
      record.entry = { ...record.entry, error, errorAction: 'expire' };
    }
    this.publish();
  }

  private publish(): void {
    this.snapshot = [...this.entries.values()].map(({ entry }) => entry);
    for (const listener of this.listeners) listener();
  }
}

export const undoManager = new UndoManager();
