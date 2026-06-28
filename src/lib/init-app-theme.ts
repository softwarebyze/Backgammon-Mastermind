import { Uniwind } from 'uniwind';

/** App ships with a single dark theme — lock Uniwind on startup. */
export function initAppTheme(): void {
  Uniwind.setTheme('dark');
}
