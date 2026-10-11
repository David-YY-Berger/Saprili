// bisiyata dishmaya, leharbot ahava biyisral
import type { JobPlan } from '@/domain/job';

export function formatPlanSummary(summary: JobPlan['summary']): string {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  return `${plural(summary.illustrations, 'illustration')}, ${plural(
    summary.colourings,
    'colouring page',
  )}, ${plural(summary.totalCalls, 'AI call')}`;
}

export function PlanSummary({ plan }: { plan: JobPlan }) {
  return (
    <div aria-live="polite" className="plan-summary">
      <strong>{plan.jobs.length === 0 ? 'Nothing to generate' : formatPlanSummary(plan.summary)}</strong>
      {plan.skipped.length > 0 && (
        <span> · {plan.skipped.length} skipped (not counted)</span>
      )}
      {plan.jobs.length > 0 && (
        <p className="plan-summary__note">
          Each call is sent to Gemini and may be billed by Google. Saprili does not estimate the price.
        </p>
      )}
    </div>
  );
}
