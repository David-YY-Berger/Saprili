// bisiyata dishmaya, leharbot ahava biyisral
export interface Clock {
  now(): Date;
  nowIso(): string;
}

export const systemClock: Clock = {
  now: () => new Date(),
  nowIso: () => new Date().toISOString(),
};

export interface FixedClock extends Clock {
  set(iso: string): void;
}

export function fixedClock(iso: string): FixedClock {
  let current = iso;
  return {
    now: () => new Date(current),
    nowIso: () => current,
    set: (next) => {
      current = next;
    },
  };
}
