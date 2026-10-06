import { Platform } from 'react-native';

/**
 * S1-0 design-pass prototype switches. Each surface has a `today` arm (the
 * shipped UI) plus the options under review. Defaults are `today` so nothing
 * changes unless a variant is requested; on web, the URL query string picks
 * one (`?status=a&tutor=b&confirm=a&banner=merged&header=slim`, or `?s1=rec`
 * for the recommended set). Throwaway: delete this module once Zachary signs
 * off and the chosen options are built for real.
 */
export type S1Variants = {
  /** Strategy chip + pip pair + tutor-on indicator. */
  status: 'today' | 'a' | 'b';
  /** Turn banner row: as today, or folded into the dice caption. */
  banner: 'today' | 'merged';
  /** Blunder review: today's modal, A corner nudge → sheet, B inline card, C one compact modal. */
  tutor: 'today' | 'a' | 'b' | 'c';
  /** Confirm bar: today's Undo+Confirm, A same-spot Confirm button, B tap-the-dice. */
  confirm: 'today' | 'a' | 'b';
  /** Header: today's 4 icons, or New game moved into the options sheet. */
  header: 'today' | 'slim';
};

const TODAY: S1Variants = {
  status: 'today',
  banner: 'today',
  tutor: 'today',
  confirm: 'today',
  header: 'today',
};

const RECOMMENDED: S1Variants = {
  status: 'a',
  banner: 'merged',
  tutor: 'b',
  confirm: 'a',
  header: 'slim',
};

const ALLOWED: { [K in keyof S1Variants]: readonly S1Variants[K][] } = {
  status: ['today', 'a', 'b'],
  banner: ['today', 'merged'],
  tutor: ['today', 'a', 'b', 'c'],
  confirm: ['today', 'a', 'b'],
  header: ['today', 'slim'],
};

function pick<K extends keyof S1Variants>(
  params: URLSearchParams,
  key: K,
  fallback: S1Variants[K],
): S1Variants[K] {
  const raw = params.get(key);
  return (ALLOWED[key] as readonly string[]).includes(raw ?? '') ? (raw as S1Variants[K]) : fallback;
}

let override: Partial<S1Variants> | null = null;

/** Tests and native dev builds can force a variant set. */
export function setS1VariantsForTests(v: Partial<S1Variants> | null) {
  override = v;
}

export function getS1Variants(): S1Variants {
  let base = TODAY;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('s1') === 'rec')
      base = RECOMMENDED;
    base = {
      status: pick(params, 'status', base.status),
      banner: pick(params, 'banner', base.banner),
      tutor: pick(params, 'tutor', base.tutor),
      confirm: pick(params, 'confirm', base.confirm),
      header: pick(params, 'header', base.header),
    };
  }
  return override ? { ...base, ...override } : base;
}
