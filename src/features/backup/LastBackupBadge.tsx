// bisiyata dishmaya, leharbot ahava biyisral
export function formatDaysAgo(iso: string, now: Date = new Date()): string {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return 'Backup date unavailable';
  const days = Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000));
  return days === 0 ? 'Backed up today' : `Last backed up ${days} day${days === 1 ? '' : 's'} ago`;
}

export function LastBackupBadge({ lastBackupAt }: { lastBackupAt: string | null }) {
  const label = lastBackupAt ? formatDaysAgo(lastBackupAt) : 'Not backed up yet';
  const needsBackup = !lastBackupAt || Date.now() - new Date(lastBackupAt).getTime() > 14 * 86_400_000;
  return (
    <span
      aria-label={label}
      className={`last-backup-badge${needsBackup ? ' last-backup-badge--nudge' : ''}`}
    >
      {label}
    </span>
  );
}
