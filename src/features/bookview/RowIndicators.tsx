// bisiyata dishmaya, leharbot ahava biyisral
import { Tooltip } from '@/ui/Tooltip';
import type { RowStatus } from './rowStatus';

const indicatorItems = [
  ['hasEnglish', 'English text'],
  ['hasHebrew', 'Hebrew text'],
  ['hasIllustration', 'Illustration'],
  ['hasColouring', 'Colouring page'],
] as const;

export function RowIndicators({ status }: { status: RowStatus }) {
  return (
    <div aria-label="Page contents" className="row-indicators">
      {indicatorItems.map(([key, label]) => {
        const active = status[key];
        const glyph = key === 'hasColouring' && status.colouringOutdated ? '!' : active ? '✓' : '–';
        return (
          <Tooltip content={key === 'hasColouring' && status.colouringOutdated ? `${label} outdated` : label} key={key}>
            <span aria-hidden="true" className={`row-indicator${active ? ' is-present' : ''}`}>
              {glyph}
            </span>
          </Tooltip>
        );
      })}
      <Tooltip content={`${status.photoCount} original photo${status.photoCount === 1 ? '' : 's'}`}>
        <span aria-hidden="true" className="row-indicator row-indicator--photos">
          {`P${status.photoCount}`}
        </span>
      </Tooltip>
    </div>
  );
}
