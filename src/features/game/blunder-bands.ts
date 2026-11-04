import colors from '@/components/ui/colors';

/** Top of the blunder scale; larger losses clamp to the end of the bar. */
export const BLUNDER_METER_MAX = 0.3;

/**
 * Standard blunder bands, from GNU Backgammon's official move annotations
 * (manual, "What do ! and ? mean?"): ?! doubtful at 0.04, ? bad at 0.08,
 * ?? very bad at 0.16. The bar caps at 0.30 for display — that cap is a
 * layout choice, not a GNU threshold; larger losses clamp to the end.
 * `flex` keeps each segment's width proportional to its equity range, and
 * the labels match the app's beginner severity words exactly.
 */
export const BLUNDER_BANDS = [
  { id: 'fine', label: 'Fine', range: '<0.04', max: 0.04, flex: 4, color: colors.success[400] },
  // Single-word label: the low bands are too narrow for longer captions
  // ("Small slip" wrapped to two lines at phone width).
  { id: 'slip', label: 'Slip', range: '0.04–0.08', max: 0.08, flex: 4, color: colors.warning[400] },
  { id: 'mistake', label: 'Mistake', range: '0.08–0.16', max: 0.16, flex: 8, color: colors.primary[400] },
  { id: 'big_blunder', label: 'Big blunder', range: '0.16+', max: BLUNDER_METER_MAX, flex: 14, color: colors.danger[400] },
] as const;

export type BlunderBand = (typeof BLUNDER_BANDS)[number];

/** The band a loss falls in; losses past the end of the bar belong to the last one. */
export function blunderBandFor(loss: number): BlunderBand {
  return BLUNDER_BANDS.find(band => loss < band.max) ?? BLUNDER_BANDS[BLUNDER_BANDS.length - 1]!;
}

/** GNU Backgammon's move annotation for each band (none for a fine play). */
export const BLUNDER_ANNOTATION: Record<BlunderBand['id'], string> = {
  fine: '',
  slip: '?!',
  mistake: '?',
  big_blunder: '??',
};
