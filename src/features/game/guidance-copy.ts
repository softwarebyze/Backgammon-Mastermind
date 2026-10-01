/**
 * Beginner-first copy for tutor guidance. Principles (see
 * docs/tutor-guidance/DESIGN.md): words first, one explained number,
 * details collapsed. The raw engine numbers never appear without units
 * and a one-line explanation of what they mean.
 */
import type { TxKeyPath } from '@/lib/i18n';

import { translate } from '@/lib/i18n';

import { BLUNDER_BANDS } from './blunder-bands';

/** Plain-word severity for an equity loss (flag threshold is 0.05). */
/**
 * Beginner words for the standard blunder bands. Boundaries follow GNU
 * Backgammon's official move annotations (manual, "What do ! and ? mean?"):
 * ?! doubtful at 0.04, ? bad at 0.08, ?? very bad at 0.16.
 *
 * Returns the BLUNDER_BANDS label directly so the modal title can never
 * disagree with the highlighted meter band.
 */
const BAND_LABEL: Record<(typeof BLUNDER_BANDS)[number]['id'], TxKeyPath> = {
  fine: 'game.tutor.band.fine',
  slip: 'game.tutor.band.slip',
  mistake: 'game.tutor.band.mistake',
  big_blunder: 'game.tutor.band.big_blunder',
};

export function blunderBandLabel(id: (typeof BLUNDER_BANDS)[number]['id']): string {
  return translate(BAND_LABEL[id]);
}

export function blunderSeverity(loss: number): string {
  const found = BLUNDER_BANDS.findIndex(band => loss < band.max);
  const index = found === -1 ? BLUNDER_BANDS.length - 1 : found;
  return blunderBandLabel(BLUNDER_BANDS[index]!.id);
}

/** "+0.12" / "−0.11" (minus sign, not hyphen). */
export function formatPoints(e: number): string {
  return `${e >= 0 ? '+' : '−'}${Math.abs(e).toFixed(2)}`;
}

export function equityExplainer(): string {
  return translate('game.tutor.equity_explainer');
}

/**
 * Blunder question copy. Deliberately contains no recommended move and no
 * candidate table — the player decides whether to peek.
 */
export function blunderQuestionBody(rank: number, candidateCount: number, loss: number): string {
  return translate('game.tutor.question_body', {
    rank,
    count: candidateCount,
    loss: loss.toFixed(2),
  });
}

/** One-line recap for the collapsed details section of the solution view. */
export function blunderDetailsSummary(rank: number, candidateCount: number, loss: number): string {
  return translate('game.tutor.details_summary', {
    rank,
    count: candidateCount,
    loss: loss.toFixed(2),
  });
}

export type CandidateRow = {
  /** "Best", "2nd", "3rd (yours)" … */
  label: string;
  /** "+0.12 pts" */
  equity: string;
  /** "−0.11 vs best" — null for the best row. */
  vsBest: string | null;
};

/** Top candidate rows with labeled columns (best-first input). */
export function candidateRows(
  equities: number[],
  playedRank: number,
  maxRows = 4,
): CandidateRow[] {
  const rows = equities.slice(0, maxRows);
  const best = rows[0];
  if (best === undefined)
    return [];
  return rows.map((equity, i) => ({
    label: i === 0
      ? translate('game.tutor.best')
      : translate(i + 1 === playedRank ? 'game.tutor.rank_yours' : 'game.tutor.rank', { rank: i + 1 }),
    equity: translate('game.tutor.equity_pts', { points: formatPoints(equity) }),
    vsBest: i === 0
      ? null
      : translate('game.tutor.vs_best', { delta: (best - equity).toFixed(2) }),
  }));
}

// ---------------------------------------------------------------------------
// Move notation for the guidance UI ("13/10 · 8/7").
// Lives here — not in sage-hint.ts — so guidance components never have to
// import the engine-adjacent hint module (which pulls in expo-bgsage).
// sage-hint.ts re-exports it for its existing callers.

function pointLabel(p: number): string {
  if (p === 0)
    return 'bar';
  if (p === 25)
    return 'off';
  return String(p);
}

/** "13/10 · 8/7" — the short move list shown in guidance and hints. */
export function formatHintNotation(moves: Array<{ from: number; to: number }>): string {
  return moves.map(m => `${pointLabel(m.from)}/${pointLabel(m.to)}`).join(' · ');
}
