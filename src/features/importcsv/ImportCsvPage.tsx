// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useRef, useState } from 'react';
import { bookRepository } from '@/storage/repositories';
import { toAppError } from '@/shared/errors';
import type { AppError } from '@/shared/errors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Spinner } from '@/ui/Spinner';
import { CsvFilePicker } from './CsvFilePicker';
import { ImportErrorList } from './ImportErrorList';
import { importBookFromCsv } from './importBook';
import type { CsvValidationResult } from './csvErrors';

export function ImportCsvPage() {
  const [checkingLibrary, setCheckingLibrary] = useState(true);
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState<CsvValidationResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const importStarted = useRef(false);

  useEffect(() => {
    let active = true;
    void bookRepository
      .listBookSummaries()
      .then((books) => {
        if (!active || importStarted.current) return;
        if (books.length > 0) window.location.hash = '#/';
      })
      .catch((loadError: unknown) => {
        if (active) setError(toAppError(loadError));
      })
      .finally(() => {
        if (active) setCheckingLibrary(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleFile = async (file: File) => {
    importStarted.current = true;
    setBusy(true);
    setValidation(null);
    setError(null);
    try {
      const result = await importBookFromCsv(file);
      if (result) setValidation(result);
    } catch (importError) {
      setError(toAppError(importError));
    } finally {
      setBusy(false);
    }
  };

  if (checkingLibrary) {
    return (
      <div aria-label="Checking your library" className="surface-card" role="status">
        <Spinner /> Checking your library…
      </div>
    );
  }

  return (
    <section aria-labelledby="import-heading">
      <header className="page-heading">
        <h2 id="import-heading">Bring in your story</h2>
        <p>
          Your first row becomes the intro. The rows after it become story pages, paired in the
          order they appear.
        </p>
      </header>
      {error && (
        <Banner type="error" title={error.userMessage}>
          {error.nextStep}
        </Banner>
      )}
      <div className="surface-card settings-form">
        <CsvFilePicker disabled={busy || error !== null} onFile={(file) => void handleFile(file)} />
        {busy && (
          <div aria-label="Importing book" role="status">
            <Spinner /> Checking your file…
          </div>
        )}
        {validation && <ImportErrorList issues={validation.issues} />}
        {error && (
          <Button onClick={() => setError(null)} variant="secondary">
            Try another file
          </Button>
        )}
      </div>
    </section>
  );
}
