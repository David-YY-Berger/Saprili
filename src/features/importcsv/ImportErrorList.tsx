// bisiyata dishmaya, leharbot ahava biyisral
import { createCsvError, type CsvIssue } from './csvErrors';

export function ImportErrorList({ issues }: { issues: CsvIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <section aria-label="CSV import errors" className="banner banner--error" role="alert">
      <h3>Please fix these CSV issues</h3>
      <ul>
        {issues.map((issue, index) => {
          const error = createCsvError(issue);
          const rowText =
            issue.rows.length === 0
              ? ''
              : ` Row${issue.rows.length === 1 ? '' : 's'} ${issue.rows.join(', ')}.`;
          return (
            <li key={`${issue.code}-${issue.rows.join('-')}-${index}`}>
              <strong>{error.userMessage}</strong>
              {rowText} {error.nextStep}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
