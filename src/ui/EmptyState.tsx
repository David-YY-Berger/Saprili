// bisiyata dishmaya, leharbot ahava biyisral
import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
  illustration = '📚',
}: {
  title: string;
  description: string;
  action?: ReactNode;
  illustration?: string;
}) {
  return (
    <section className="empty-state">
      <span aria-hidden="true" className="empty-state__art">
        {illustration}
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </section>
  );
}
