import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

export type TimerSfxKind = 'click' | 'warn' | 'timeout';

const SOURCES: Record<TimerSfxKind, number> = {
  click: require('../../../assets/sounds/timer-click.wav'),
  warn: require('../../../assets/sounds/timer-warn.wav'),
  timeout: require('../../../assets/sounds/timer-timeout.wav'),
};

const VOLUME: Record<TimerSfxKind, number> = {
  click: 0.3,
  warn: 0.42,
  timeout: 0.55,
};

type Player = ReturnType<typeof createAudioPlayer>;

const players = new Map<TimerSfxKind, Player>();
let audioModeReady = false;

/** Configure foreground sounds once while respecting silent mode; permit retry if setup fails. */
async function warmAudioMode(): Promise<void> {
  if (audioModeReady || Platform.OS === 'web') {
    return;
  }
  audioModeReady = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });
  }
  catch {
    audioModeReady = false;
  }
}

/** Reuse one native audio player per clock sound and assign its restrained playback volume. */
function playerFor(kind: TimerSfxKind): Player {
  const existing = players.get(kind);
  if (existing) {
    return existing;
  }
  const player = createAudioPlayer(SOURCES[kind]);
  player.volume = VOLUME[kind];
  players.set(kind, player);
  return player;
}

/** Create the players ahead of the first beep. Safe to call on mount. */
export function ensureTimerSfxReady(): void {
  void warmAudioMode();
  try {
    for (const kind of Object.keys(SOURCES) as TimerSfxKind[]) {
      playerFor(kind);
    }
  }
  catch {
    // Audio is a nicety — the clock works without it.
  }
}

/**
 * One-shot clock sound. Call click/pause sounds from the press handler so web
 * browsers count them as part of the user gesture.
 */
export function playTimerSfx(kind: TimerSfxKind): void {
  try {
    const player = playerFor(kind);
    const atStart = player.currentTime === 0 && !player.playing;
    if (atStart) {
      player.play();
      return;
    }
    void player.seekTo(0).then(() => {
      player.play();
    }).catch(() => {
      // The player can be released while the screen is closing.
    });
  }
  catch {
    // Never let audio break the clock.
  }
}

/** Test-only: drop warmed players so cases stay isolated. */
export function resetTimerSfxForTests(): void {
  for (const player of players.values()) {
    player.remove();
  }
  players.clear();
  audioModeReady = false;
}
