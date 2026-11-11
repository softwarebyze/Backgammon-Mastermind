import { Platform } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { translate } from '@/lib/i18n';

type PwaEnvironment = {
  platform: string;
  production: boolean;
  hasServiceWorker: boolean;
};

/**
 * The PWA is an enhancement, never a requirement: registering a worker and
 * offering the reload prompt must never break the game.
 */
export function shouldRegisterPwa(env: PwaEnvironment): boolean {
  return env.platform === 'web' && env.production && env.hasServiceWorker;
}

function reload(): void {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

function promptReload(): void {
  showMessage({
    message: translate('pwa.update_available'),
    type: 'info',
    // Stay on screen until the player taps it: a disappearing toast could
    // leave a long-lived tab running old code with no way to update.
    autoHide: false,
    onPress: reload,
  });
}

/**
 * Register the offline worker on the web and prompt for a reload when a new
 * version takes over. Returns a cleanup function; safe to call on native.
 */
export function registerServiceWorker(): (() => void) | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  const hasServiceWorker = 'serviceWorker' in navigator;
  if (!shouldRegisterPwa({
    platform: Platform.OS,
    production: process.env.NODE_ENV === 'production',
    hasServiceWorker,
  })) {
    return undefined;
  }

  // A controller on the way in means this tab already ran the app; a new
  // worker taking over is then an update worth offering to load.
  let hadController = navigator.serviceWorker.controller !== null;
  let prompted = false;
  const onControllerChange = () => {
    if (hadController && !prompted) {
      prompted = true;
      promptReload();
    }
    // The first claim is setup, not an update: later takeovers are updates.
    hadController = true;
  };
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

  let registration: ServiceWorkerRegistration | undefined;
  let disposed = false;
  const checkForUpdate = () => {
    if (document.visibilityState === 'visible') {
      void registration?.update().catch(() => {});
    }
  };

  void navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registered) => {
      if (disposed) {
        return;
      }
      registration = registered;
      document.addEventListener('visibilitychange', checkForUpdate);
    })
    // Offline support is optional: a blocked worker (private mode, old
    // browser) simply leaves the app in its current online-only state.
    .catch(() => {});

  return () => {
    disposed = true;
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    document.removeEventListener('visibilitychange', checkForUpdate);
  };
}
