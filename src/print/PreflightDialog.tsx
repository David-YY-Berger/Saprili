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
  open,
  onClose,
}: {
  book: Book;
  edition: Edition;
  open: boolean;
  onClose: () => void;
}) {
  const [images, setImages] = useState<ReadonlyMap<string, ImageRecord> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [selectedEdition, setSelectedEdition] = useState(edition);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setImages(null);
    setError(null);
    void imageRepository
      .listImageIdsForBook(book.id)
      .then((ids) => Promise.all(ids.map((id) => imageRepository.getImage(id))))
      .then((records) => {
        if (active) setImages(new Map(records.flatMap((record) => (record ? [[record.id, record] as const] : []))));
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError);
      });
    return () => {
      active = false;
    };
  }, [book.id, open]);

  const report = useMemo(
    () => (images ? runPreflight(book, selectedEdition, images) : null),
    [book, images, selectedEdition],
  );
  const grouped = useMemo(() => {
    const groups = new Map<string, { pageRef: PageRef; title: string; issues: NonNullable<typeof report>['issues'] }>();
    for (const issue of report?.issues ?? []) {
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
  }, [book, report]);

  const jumpToPage = (pageRef: PageRef) => {
    const pageId = encodeURIComponent(pageRef.id);
    window.location.hash = `#/book/${encodeURIComponent(book.id)}/page/${pageId}`;
    onClose();
  };

  return (
    <Modal onClose={onClose} open={open} title="Print pre-flight">
      <p>Review these notes before printing. Warnings do not block export.</p>
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
      {error !== null && (
        <Banner type="error" title="Pre-flight could not load image details">
          {toAppError(error).nextStep}
        </Banner>
      )}
      {!images && error === null && <p role="status">Checking book images…</p>}
      {report && grouped.length === 0 && <Banner>Everything is ready for the next print step.</Banner>}
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
        <Button onClick={onClose} variant="secondary">
          Close
        </Button>
      </div>
    </Modal>
  );
}
