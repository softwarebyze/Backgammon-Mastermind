import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

function visibleHeight() {
  if (typeof window === 'undefined')
    return null;
  return window.visualViewport?.height ?? window.innerHeight;
}

/**
 * Web only: the height the browser actually shows. iOS Safari lays the page
 * out taller than the area above its toolbar, so the window height overstates it.
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
