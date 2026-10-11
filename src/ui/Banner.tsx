// bisiyata dishmaya, leharbot ahava biyisral
import type { ReactNode } from 'react';

export type BannerType = 'info' | 'warning' | 'error';

export function Banner({
  type = 'info',
  children,
  title,
}: {
  type?: BannerType;
  children: ReactNode;
  title?: string;
}) {
  return (
    <div
      className={`banner${type === 'info' ? '' : ` banner--${type}`}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      {title && <strong>{title} </strong>}
      {children}
    </div>
  );
}
