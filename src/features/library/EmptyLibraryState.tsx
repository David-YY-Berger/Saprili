// bisiyata dishmaya, leharbot ahava biyisral
import { EmptyState } from '@/ui/EmptyState';
import { ImportCsvButton } from './ImportCsvButton';

export function EmptyLibraryState({ allowImport = true }: { allowImport?: boolean }) {
  return (
    <EmptyState
      action={allowImport ? <ImportCsvButton /> : undefined}
      description="Your storybooks will live here. Start by bringing in your first book, and Saprili will help you shape it."
      illustration="✨"
      title="A little library, just for your family"
    />
  );
}
