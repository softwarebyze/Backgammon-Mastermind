import { useEffect } from 'react';
import { Platform } from 'react-native';
import { goBackOrHome } from '@/lib/navigation/go-back-or-home';

type EscapeContext = { isFocused: () => boolean; dialogOpen: () => boolean; goBack: () => void };

/** Escape leaves the screen, unless a dialog is open: that dialog closes first. */
export function handleEscapeKey(event: Pick<KeyboardEvent, 'key' | 'defaultPrevented'>, context: EscapeContext): boolean {
  if (event.key !== 'Escape' || event.defaultPrevented || !context.isFocused() || context.dialogOpen())
    return false;
  context.goBack();
  return true;
}

/** Web: Escape on a stack screen (Settings, Positions…) returns to where you came from. */
export function useEscapeToGoBack(isFocused: () => boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined')
      return;
    const onKeyDown = (event: KeyboardEvent) => {
      handleEscapeKey(event, {
        isFocused,
        dialogOpen: () => !!document.querySelector('[aria-modal="true"]'),
        goBack: goBackOrHome,
      });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isFocused]);
}
