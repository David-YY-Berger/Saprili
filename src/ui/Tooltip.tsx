// bisiyata dishmaya, leharbot ahava biyisral
import type { ReactNode } from 'react';

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <span className="tooltip">
      {children}
      <span className="tooltip__content" role="tooltip">
        {content}
      </span>
    </span>
  );
}
