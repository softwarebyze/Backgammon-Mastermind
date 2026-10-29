import type { SavedPosition } from '@/lib/positions/saved-positions';
import { getLanguage, translate } from '@/lib/i18n';

/** "29 Oct 2026, 15:40 · From a game". Entries saved before timestamps only show their source. */
export function savedPositionMeta(entry: Pick<SavedPosition, 'savedAt' | 'source'>, locale = getLanguage()): string {
  const parts: string[] = [];
  if (entry.savedAt !== undefined) {
    try {
      parts.push(new Date(entry.savedAt).toLocaleString(locale ?? undefined, { dateStyle: 'medium', timeStyle: 'short' }));
    }
    catch {
      parts.push(new Date(entry.savedAt).toISOString().slice(0, 16).replace('T', ' '));
    }
  }
  if (entry.source === 'game')
    parts.push(translate('positions.from_game'));
  return parts.join(' · ');
}
