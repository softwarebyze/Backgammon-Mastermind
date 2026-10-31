import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** Home spacing at a fit level: 1 is the roomy design, 0 the tightest. */
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

export function homeFitAt(level: number): HomeFit {
  const t = Math.min(1, Math.max(0, level));
  const out = {} as HomeFit;
  for (const key of Object.keys(ROOMY) as (keyof HomeFit)[])
    out[key] = Math.round(TIGHT[key] + (ROOMY[key] - TIGHT[key]) * t);
  return out;
}

/** Vertical space the fit-dependent sizes take with `buttons` mode buttons. */
function flexibleHeight(fit: HomeFit, buttons: number) {
  return fit.top + fit.logo + fit.logoTop + fit.logoBottom + fit.dividerGap * 2
    + fit.buttonPad * 2 * buttons + fit.buttonGap * Math.max(0, buttons - 1)
    + fit.buttonsBottom + fit.bottom;
}

/**
 * The roomiest level whose content fits `available`. `measured` is the brand
 * plus buttons height laid out at `level`, without the outer padding and the
 * buttons' bottom margin. Text height doesn't depend on the level, so one
 * measurement is enough to solve for it.
 */
export function homeFitLevel({ available, measured, level, buttons }: {
  available: number;
  measured: number;
  level: number;
  buttons: number;
}) {
  const now = homeFitAt(level);
  const text = measured + now.top + now.buttonsBottom + now.bottom - flexibleHeight(now, buttons);
  const roomy = flexibleHeight(ROOMY, buttons);
  const tight = flexibleHeight(TIGHT, buttons);
  let fit = Math.min(1, Math.max(0, Math.floor((available - text - tight) / (roomy - tight) * 100) / 100));
  // homeFitAt rounds each size, which can add a few pixels: step down until it fits.
  while (fit > 0 && text + flexibleHeight(homeFitAt(fit), buttons) > available)
    fit = Math.max(0, Math.round((fit - 0.01) * 100) / 100);
  return fit;
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
