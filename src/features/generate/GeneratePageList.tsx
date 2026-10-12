// bisiyata dishmaya, leharbot ahava biyisral
import type { Book } from '@/domain/book';
import type { Job, JobPlan } from '@/domain/job';
import { getCoverImageIds } from '@/layout/render/pageImages';
import { StatusPill } from './StatusPill';
import type { GenerateSelection, JobSwitches } from './jobPlan';

const NEEDS_ILLUSTRATION = 'Needs an illustration first';

function findJob(jobs: readonly Job[], kind: Job['kind'], pageId: string | null): Job | undefined {
  return jobs.find((job) => {
    if (job.kind !== kind) return false;
    return pageId === null
      ? job.target.kind === 'cover'
      : job.target.kind === 'story' && job.target.pageId === pageId;
  });
}

export function GeneratePageList({
  book,
  selection,
  switches,
  plan,
  jobs,
  disabled,
  onToggle,
}: {
  book: Book;
  selection: GenerateSelection;
  switches: JobSwitches;
  plan: JobPlan;
  jobs: readonly Job[];
  disabled: boolean;
  /** `null` toggles the cover row. */
  onToggle: (pageId: string | null, selected: boolean) => void;
}) {
  const isBlocked = (pageId: string): boolean =>
    plan.skipped.some(
      (item) =>
        item.kind === 'colouring' &&
        item.target.kind === 'story' &&
        item.target.pageId === pageId &&
        item.reason === NEEDS_ILLUSTRATION,
    );
  // A page cannot be picked when colouring is the only job and it has no illustration to colour.
  const colouringOnly = switches.colouring.enabled && !switches.illustrations.enabled;
  const coverHasArtwork = getCoverImageIds(book).length > 0;
  const pill = (job: Job | undefined, prefix: string) =>
    job ? <StatusPill prefix={prefix} status={job.status} /> : null;

  return (
    <ul aria-label="Pages to generate" className="generate-list">
      <li className="generate-list__row">
        <label>
          <input
            checked={selection.cover}
            disabled={disabled}
            onChange={(event) => onToggle(null, event.target.checked)}
            type="checkbox"
          />{' '}
          Cover
        </label>
        <span className="generate-list__status">
          {coverHasArtwork ? 'Has cover artwork' : 'No cover artwork'}{' '}
          {pill(findJob(jobs, 'coverIllustration', null), 'Illustration')}
        </span>
      </li>
      {book.storyPages.map((page, index) => {
        const blocked = isBlocked(page.id);
        return (
          <li
            className={`generate-list__row${blocked ? ' generate-list__row--grey' : ''}`}
            key={page.id}
          >
            <label>
              <input
                checked={selection.pageIds.has(page.id)}
                disabled={disabled || (colouringOnly && !page.illustration.currentImageId)}
                onChange={(event) => onToggle(page.id, event.target.checked)}
                type="checkbox"
              />{' '}
              Page {index + 1}
              {page.privateTitle ? ` · ${page.privateTitle}` : ''}
            </label>
            <span className="generate-list__status">
              {page.illustration.currentImageId ? 'Illustrated' : 'No illustration'}
              {page.colouring.imageId ? ' · coloured' : ''}{' '}
              {pill(findJob(jobs, 'illustration', page.id), 'Illustration')}{' '}
              {pill(findJob(jobs, 'colouring', page.id), 'Colouring')}
              {blocked && <em className="generate-list__reason"> {NEEDS_ILLUSTRATION}</em>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
