// bisiyata dishmaya, leharbot ahava biyisral
import { EmptyState } from '@/ui/EmptyState';
import { NewBookButton } from './NewBookButton';

export function EmptyLibraryState() {
  return (
    <EmptyState
      action={<NewBookButton />}
      description="Your storybooks will live here. Start by creating your first book: add characters and an intro page, then import the story pages from a CSV."
      illustration="✨"
      title="A little library, just for your family"
    />
  );
}
