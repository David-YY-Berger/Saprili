// bisiyata dishmaya, leharbot ahava biyisral
import { EmptyState } from '@/ui/EmptyState';

export function ComingSoonPage() {
  return (
    <div className="coming-soon">
      <EmptyState
        action={
          <a className="button" href="#/">
            Back to your library
          </a>
        }
        description="This part of Saprili is on its way. Your books and settings are ready here in the meantime."
        illustration="🛠️"
        title="More story-making tools are coming soon"
      />
    </div>
  );
}
