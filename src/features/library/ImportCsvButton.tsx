// bisiyata dishmaya, leharbot ahava biyisral
import { Button } from '@/ui/Button';

export function ImportCsvButton() {
  return (
    <Button
      onClick={() => {
        window.location.hash = '#/import';
      }}
    >
      Import book1 from CSV
    </Button>
  );
}
