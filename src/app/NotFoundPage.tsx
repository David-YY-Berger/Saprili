// bisiyata dishmaya, leharbot ahava biyisral
import { EmptyState } from '@/ui/EmptyState';

export function NotFoundPage() {
  return (
    <div className="coming-soon">
      <EmptyState
        action={
          <a className="button" href="#/">
            Back to your library
          </a>
        }
        description="That page does not exist. Your books are safe in the library."
        illustration="🔎"
        title="We could not find that page"
      />
    </div>
  );
}
