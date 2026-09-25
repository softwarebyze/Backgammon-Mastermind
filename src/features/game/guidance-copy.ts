/**
 * Beginner-first copy for tutor guidance. Principles (see
 * docs/tutor-guidance/DESIGN.md): words first, one explained number,
 * details collapsed. The raw engine numbers never appear without units
 * and a one-line explanation of what they mean.
 */
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
export function blunderSeverity(loss: number): string {
  const found = BLUNDER_BANDS.findIndex(band => loss < band.max);
  const index = found === -1 ? BLUNDER_BANDS.length - 1 : found;
  return BLUNDER_BANDS[index].label;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13)
    return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** "+0.12" / "−0.11" (minus sign, not hyphen). */
export function formatPoints(e: number): string {
  return `${e >= 0 ? '+' : '−'}${Math.abs(e).toFixed(2)}`;
}

export const EQUITY_EXPLAINER
  = 'The engine scores each move by the points it expects to win per game, on average. Higher is better.';

/**
 * Blunder question copy. Deliberately contains no recommended move and no
 * candidate table — the player decides whether to peek.
 */
export function blunderQuestionBody(rank: number, candidateCount: number, loss: number): string {
  return (
    `Your move was the ${ordinal(rank)}-best of ${candidateCount} ways to play this roll. `
    + `On average, it scores about ${loss.toFixed(2)} points per game less than the best move.`
  );
}

/** One-line recap for the collapsed details section of the solution view. */
export function blunderDetailsSummary(rank: number, candidateCount: number, loss: number): string {
  return (
    `Your move ranked ${ordinal(rank)} of ${candidateCount}, scoring about `
    + `${loss.toFixed(2)} points per game less than the best move.`
  );
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
    label: i === 0 ? 'Best' : `${ordinal(i + 1)}${i + 1 === playedRank ? ' (yours)' : ''}`,
    equity: `${formatPoints(equity)} pts`,
    vsBest: i === 0 ? null : `−${(best - equity).toFixed(2)} vs best`,
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
