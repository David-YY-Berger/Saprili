// bisiyata dishmaya, leharbot ahava biyisral
import type { ResolvedTheme } from '../theme';

/** Floods the whole canvas, including the bleed band. */
export function BackgroundLayer({ theme }: { theme: ResolvedTheme }) {
  return (
    <div
      data-layer="background"
      style={{ position: 'absolute', inset: 0, background: theme.background }}
    />
  );
}
