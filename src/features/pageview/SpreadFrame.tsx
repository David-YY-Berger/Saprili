// bisiyata dishmaya, leharbot ahava biyisral
import type { ReactNode } from 'react';

export function SpreadFrame({ children }: { children: ReactNode }) {
  return <div aria-label="Book spread" className="spread-frame">{children}</div>;
}
