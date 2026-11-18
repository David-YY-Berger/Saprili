// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import type { Book } from '@/domain/book';
import { toAppError } from '@/shared/errors';
import type { AppError } from '@/shared/errors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Spinner } from '@/ui/Spinner';
import { CsvFilePicker } from './CsvFilePicker';
import { ImportErrorList } from './ImportErrorList';
import { CSV_LLM_INSTRUCTIONS } from './csvInstructions';
import { importStoryPagesFromCsv, isStoryBodyUntouched } from './importBook';
import type { CsvValidationResult } from './csvErrors';

export function ImportCsvPage({ book }: { book: Book }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validation, setValidation] = useState<CsvValidationResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const bookHash = `#/book/${encodeURIComponent(book.id)}`;

  const handleFile = async (file: File) => {
    setBusy(true);
    setValidation(null);
    setError(null);
    try {
      const result = await importStoryPagesFromCsv(book.id, file);
      if (result) setValidation(result);
    } catch (importError) {
      setError(toAppError(importError));
    } finally {
      setBusy(false);
    }
  };

  const copyInstructions = async () => {
    try {
      await navigator.clipboard.writeText(CSV_LLM_INSTRUCTIONS);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby="import-heading">
      <header className="page-heading">
        <h2 id="import-heading">Import story pages from CSV</h2>
        <p>
          Every row becomes one story page, paired in the order they appear. The intro page is not
          part of the CSV.
        </p>
      </header>
      {!isStoryBodyUntouched(book) && (
        <Banner type="error" title="This book already has story pages with content.">
          CSV import is only available before you start the story pages.
        </Banner>
      )}
      {error && (
        <Banner type="error" title={error.userMessage}>
          {error.nextStep}
        </Banner>
      )}
      <div className="surface-card settings-form">
        <h3>1. Copy these directions to your LLM</h3>
        <p>Paste them together with your story, then upload the CSV it gives you.</p>
        <textarea
          aria-label="CSV directions for your LLM"
          dir="ltr"
          readOnly
          rows={16}
          value={CSV_LLM_INSTRUCTIONS}
        />
        <div>
          <Button onClick={() => void copyInstructions()} variant="secondary">
            Copy directions
          </Button>
          {copied && <span role="status"> Copied.</span>}
        </div>
      </div>
      <div className="surface-card settings-form">
        <h3>2. Upload the CSV</h3>
        <CsvFilePicker
          disabled={busy || !isStoryBodyUntouched(book)}
          onFile={(file) => void handleFile(file)}
        />
        {busy && (
          <div aria-label="Importing pages" role="status">
            <Spinner /> Checking your file…
          </div>
        )}
        {validation && <ImportErrorList issues={validation.issues} />}
        <Button
          onClick={() => {
            window.location.hash = bookHash;
          }}
          variant="secondary"
        >
          Back to the book
        </Button>
      </div>
    </section>
  );
}
