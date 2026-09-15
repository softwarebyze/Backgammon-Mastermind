import type { GameState } from '@/lib/game';
import { Alert, Platform } from 'react-native';

import { confirmAction } from '@/lib/confirm';
import { hasSavedGame, isResumableGame } from '@/lib/game/persistence';
import { translate } from '@/lib/i18n';

type NewGameSource = 'home' | 'learn' | 'reset';

type ReplaceActiveGameOpts = {
  source: NewGameSource;
  liveState: GameState | null;
  onReplace: () => void;
  onContinue?: () => void;
};

export function shouldConfirmNewGame(
  source: NewGameSource,
  liveState: GameState | null | undefined,
): boolean {
  if (source === 'reset' && liveState?.phase === 'game-over') {
    return false;
  }
  return isResumableGame(liveState) || hasSavedGame();
}

function confirmWithDialog(opts: ReplaceActiveGameOpts): void {
  confirmAction({
    title: translate('home.confirm_title'),
    message: opts.source === 'home'
      ? translate('home.confirm_web')
      : translate('home.confirm_replace'),
    confirmLabel: translate('home.confirm_new'),
    cancelLabel: translate('home.confirm_cancel'),
    destructive: true,
    onConfirm: opts.onReplace,
  });
}

function confirmHomeNative(opts: ReplaceActiveGameOpts): void {
  Alert.alert(
    translate('home.confirm_title'),
    translate('home.confirm_native'),
    [
      {
        text: translate('home.confirm_continue'),
        onPress: () => opts.onContinue?.(),
      },
      {
        text: translate('home.confirm_new'),
        style: 'destructive',
        onPress: opts.onReplace,
      },
      { text: translate('home.confirm_cancel'), style: 'cancel' },
    ],
  );
}

function presentReplaceConfirmation(opts: ReplaceActiveGameOpts): void {
  if (opts.source === 'home' && Platform.OS !== 'web') {
    confirmHomeNative(opts);
    return;
  }
  confirmWithDialog(opts);
}

/** Every new-game entry point must go through this replacement policy. */
export function requestReplaceActiveGame(opts: ReplaceActiveGameOpts): void {
  if (!shouldConfirmNewGame(opts.source, opts.liveState)) {
    opts.onReplace();
    return;
  }
  presentReplaceConfirmation(opts);
}
