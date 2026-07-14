import type { GameSfxKind } from '@/lib/game-sfx/move-sfx';

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { loadGamePreferences } from '@/lib/game-preferences/storage';

const SOURCES: Record<GameSfxKind, number> = {
  roll: require('../../../assets/sounds/roll.wav'),
  hit: require('../../../assets/sounds/hit.wav'),
  bearOff: require('../../../assets/sounds/bear-off.wav'),
  win: require('../../../assets/sounds/win.wav'),
};

type Player = ReturnType<typeof createAudioPlayer>;

let ready = false;
const players = new Map<GameSfxKind, Player>();

async function ensureReady() {
  if (ready) {
    return;
  }
  // Respect the hardware silent switch — tasteful, not insistent.
  await setAudioModeAsync({
    playsInSilentMode: false,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
  });
  for (const kind of Object.keys(SOURCES) as GameSfxKind[]) {
    const player = createAudioPlayer(SOURCES[kind]);
    player.volume = 0.55;
    players.set(kind, player);
  }
  ready = true;
}

/**
 * Soft one-shot SFX. No-ops when sound is disabled or audio fails to load.
 * Safe to call from game logic (fire-and-forget).
 */
export function playGameSfx(kind: GameSfxKind): void {
  const { soundEnabled } = loadGamePreferences();
  if (!soundEnabled) {
    return;
  }

  void (async () => {
    try {
      await ensureReady();
      const player = players.get(kind);
      if (!player) {
        return;
      }
      await player.seekTo(0);
      player.play();
    }
    catch {
      // Mirror haptics — never throw into gameplay.
    }
  })();
}

export function playGameSfxSequence(kinds: GameSfxKind[]): void {
  kinds.forEach((kind, i) => {
    // Tiny stagger so hit+bearOff don't completely stack as one mush.
    setTimeout(() => playGameSfx(kind), i * 40);
  });
}
