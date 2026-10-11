// bisiyata dishmaya, leharbot ahava biyisral
import { useEffect, useMemo, useState } from 'react';
import type { Book } from '@/domain/book';
import type { ImageRecord } from '@/domain/image';
import type { PageRef } from '@/domain/page';
import { imageRepository } from '@/storage/repositories';
import { toAppError } from '@/shared/errors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import { runPreflight } from '@/layout/preflight';
import type { Edition } from '@/layout/theme';
import type { PrintOutput } from './printJob';

function pageTitle(book: Book, pageRef: PageRef): string {
  if (pageRef.kind === 'intro') return 'Intro page';
  if (pageRef.kind === 'colophon') return 'Colophon';
  return (
    book.storyPages.find((page) => page.id === pageRef.id)?.privateTitle ||
    `Story page ${book.storyPages.findIndex((page) => page.id === pageRef.id) + 1}`
  );
}

export function PreflightDialog({
  book,
  edition,
  output,
  pageId,
  onConfirm,
  open,
  onClose,
}: {
  book: Book;
  edition: Edition;
  output?: PrintOutput;
  pageId?: string;
  onConfirm?: () => Promise<void>;
  open: boolean;
  onClose: () => void;
}) {
  const [images, setImages] = useState<ReadonlyMap<string, ImageRecord> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [selectedEdition, setSelectedEdition] = useState(edition);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<unknown>(null);
  const reportEdition: Edition =
    output === 'colouring' ? 'colouring' : output ? 'colour' : selectedEdition;
  useEffect(() => {
    if (!open) return;
    let active = true;
    setImages(null);
    setError(null);
    void imageRepository
      .listImageIdsForBook(book.id)
      .then((ids) => Promise.all(ids.map((id) => imageRepository.getImage(id))))
      .then((records) => {
        if (active)
          setImages(
            new Map(records.flatMap((record) => (record ? [[record.id, record] as const] : []))),
          );
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError);
      });
    return () => {
      active = false;
    };
  }, [book.id, open]);

  const report = useMemo(
    () => (images ? runPreflight(book, reportEdition, images) : null),
    [book, images, reportEdition],
  );
  const grouped = useMemo(() => {
    const groups = new Map<
      string,
      { pageRef: PageRef; title: string; issues: NonNullable<typeof report>['issues'] }
    >();
    for (const issue of report?.issues ?? []) {
      if (output === 'page' && pageId && issue.pageRef.id !== pageId) continue;
      const key = `${issue.pageRef.kind}:${issue.pageRef.id}`;
      const group = groups.get(key) ?? {
        pageRef: issue.pageRef,
        title: pageTitle(book, issue.pageRef),
        issues: [],
      };
      group.issues.push(issue);
      groups.set(key, group);
    }
    return [...groups.values()];
  }, [book, output, pageId, report]);

  const jumpToPage = (pageRef: PageRef) => {
    const pageId = encodeURIComponent(pageRef.id);
    window.location.hash = `#/book/${encodeURIComponent(book.id)}/page/${pageId}`;
    onClose();
  };
  const confirmPrint = async () => {
    if (!onConfirm) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      await onConfirm();
      onClose();
    } catch (printError) {
      setConfirmError(printError);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="Print pre-flight">
      <p>Review these notes before printing. Warnings do not block export.</p>
      <Banner type="warning" title="Colour profile not verified">
        PDFs are exported in RGB. The print shop&apos;s RGB/CMYK requirement is unknown; if CMYK or
        PDF/X is required, have the file converted through a trusted prepress workflow before
        printing.
      </Banner>
      {output ? (
        <p>
          Output:{' '}
          {output === 'colouring'
            ? 'Colouring book'
            : output === 'page'
              ? 'Single page'
              : 'Print book'}
        </p>
      ) : (
        <label className="field">
          <span>Edition</span>
          <select
            onChange={(event) => setSelectedEdition(event.currentTarget.value as Edition)}
            value={selectedEdition}
          >
            <option value="colour">Print book</option>
            <option value="colouring">Colouring book</option>
          </select>
        </label>
      )}
      {confirmError !== null && (
        <Banner type="error" title={toAppError(confirmError, 'PRINT_ASSET_FAILED').userMessage}>
          {toAppError(confirmError, 'PRINT_ASSET_FAILED').nextStep}
        </Banner>
      )}
      {error !== null && (
        <Banner type="error" title="Pre-flight could not load image details">
          {toAppError(error).nextStep}
        </Banner>
      )}
      {!images && error === null && <p role="status">Checking book images…</p>}
      {report && grouped.length === 0 && (
        <Banner>Everything is ready for the next print step.</Banner>
      )}
      {grouped.map((group) => (
        <section className="preflight-group" key={`${group.pageRef.kind}:${group.pageRef.id}`}>
          <h3>{group.title}</h3>
          <ul>
            {group.issues.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>
                <strong>{issue.severity === 'info' ? 'Notice' : 'Warning'}:</strong> {issue.message}{' '}
                {issue.nextStep}
              </li>
            ))}
          </ul>
          <Button onClick={() => jumpToPage(group.pageRef)} variant="secondary">
            Go to {group.title}
          </Button>
        </section>
      ))}
      <div className="modal__actions">
        {onConfirm && (
          <Button
            disabled={!report || error !== null || confirming}
            onClick={() => void confirmPrint()}
          >
            {confirming ? 'Opening print file…' : 'Continue to print'}
          </Button>
        )}
        <Button onClick={onClose} variant="secondary">
          Close
        </Button>
      </div>
    </Modal>
  );
}
