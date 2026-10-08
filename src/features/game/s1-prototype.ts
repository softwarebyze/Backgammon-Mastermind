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

const STORAGE_KEY = 's1-variants';
const KEYS: (keyof S1Variants)[] = ['status', 'banner', 'tutor', 'confirm', 'header'];

/** Query string wins and is remembered for the session, so in-app navigation keeps the variant. */
function readWebVariants(): S1Variants {
  const params = new URLSearchParams(window.location.search);
  const requested = params.has('s1') || KEYS.some(k => params.has(k));
  if (!requested) {
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (saved)
        return { ...TODAY, ...(JSON.parse(saved) as Partial<S1Variants>) };
    }
    catch {}
    return TODAY;
  }
  const base = params.get('s1') === 'rec' ? RECOMMENDED : TODAY;
  const resolved: S1Variants = {
    status: pick(params, 'status', base.status),
    banner: pick(params, 'banner', base.banner),
    tutor: pick(params, 'tutor', base.tutor),
    confirm: pick(params, 'confirm', base.confirm),
    header: pick(params, 'header', base.header),
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
  }
  catch {}
  return resolved;
}

export function getS1Variants(): S1Variants {
  const base = Platform.OS === 'web' && typeof window !== 'undefined' ? readWebVariants() : TODAY;
  return override ? { ...base, ...override } : base;
}
