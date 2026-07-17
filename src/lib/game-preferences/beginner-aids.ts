import { patchGamePreferences } from './use-game-preferences';

/** Turn on the board aids that help a new player in their first real game. */
export function enableBeginnerGameAids(): void {
  patchGamePreferences({
    showMoveHints: true,
    showDirectionOverlay: true,
    showPointNumbers: true,
  });
}
