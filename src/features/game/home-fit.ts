import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Home spacing at a fit level: 1 is the roomy design, 0 tight, and -1 the
 * compact last resort for the shortest screens (e.g. with Resume at 320x400).
 */
export type HomeFit = {
  top: number;
  logo: number;
  logoTop: number;
  logoBottom: number;
  dividerGap: number;
  buttonPad: number;
  buttonGap: number;
  buttonsBottom: number;
  bottom: number;
};

const ROOMY: HomeFit = { top: 40, logo: 110, logoTop: 8, logoBottom: 20, dividerGap: 24, buttonPad: 14, buttonGap: 14, buttonsBottom: 24, bottom: 32 };
const TIGHT: HomeFit = { top: 6, logo: 48, logoTop: 0, logoBottom: 8, dividerGap: 6, buttonPad: 8, buttonGap: 8, buttonsBottom: 0, bottom: 12 };
// The logo stays tall enough to keep the title below the floating gear.
const COMPACT: HomeFit = { top: 4, logo: 28, logoTop: 0, logoBottom: 4, dividerGap: 3, buttonPad: 4, buttonGap: 6, buttonsBottom: 0, bottom: 8 };

const HOME_FIT_MIN_LEVEL = -1;

export function homeFitAt(level: number): HomeFit {
  const t = Math.min(1, Math.max(HOME_FIT_MIN_LEVEL, level));
  const [from, to, k] = t >= 0 ? [TIGHT, ROOMY, t] : [COMPACT, TIGHT, t + 1];
  const out = {} as HomeFit;
  for (const key of Object.keys(ROOMY) as (keyof HomeFit)[])
    out[key] = Math.round(from[key] + (to[key] - from[key]) * k);
  return out;
}

/** Fit-dependent height inside the brand block (logo and divider). */
export function brandSpace(fit: HomeFit) {
  return fit.logo + fit.logoTop + fit.logoBottom + fit.dividerGap * 2;
}

/** Fit-dependent height inside the buttons block (padding and gaps). */
export function buttonsSpace(fit: HomeFit, buttons: number) {
  return fit.buttonPad * 2 * buttons + fit.buttonGap * Math.max(0, buttons - 1);
}

/**
 * The roomiest level, in steps of 0.01, at which the menu fits `available`.
 * `text` is the menu's height minus every fit-dependent size, so it is the
 * same at every level and only changes when the text or width does.
 */
export function homeFitLevel({ available, text, buttons }: {
  available: number;
  text: number;
  buttons: number;
}) {
  for (let step = 100; step > HOME_FIT_MIN_LEVEL * 100; step--) {
    const fit = homeFitAt(step / 100);
    if (text + fit.top + brandSpace(fit) + buttonsSpace(fit, buttons) + fit.buttonsBottom + fit.bottom <= available)
      return step / 100;
  }
  return HOME_FIT_MIN_LEVEL;
}

function visibleHeight() {
  if (typeof window === 'undefined')
    return null;
  return window.visualViewport?.height ?? window.innerHeight;
}

/**
 * Web only: the height Safari actually shows. iOS Safari lays the page out
 * taller than the area above its toolbar, so window height overstates it.
 */
export function useWebVisibleHeight(): number | null {
  const [height, setHeight] = useState(() => (Platform.OS === 'web' ? visibleHeight() : null));
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined')
      return;
    const update = () => setHeight(visibleHeight());
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return height;
}
