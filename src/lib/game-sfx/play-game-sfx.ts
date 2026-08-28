import type { GameSfxKind } from '@/lib/game-sfx/move-sfx';

import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { loadGamePreferences } from '@/lib/game-preferences/storage';

const SOURCES: Record<GameSfxKind, number> = {
  roll: require('../../../assets/sounds/roll.wav'),
  place: require('../../../assets/sounds/place.wav'),
  hit: require('../../../assets/sounds/hit.wav'),
  bearOff: require('../../../assets/sounds/bear-off.wav'),
  win: require('../../../assets/sounds/win.wav'),
};

const KINDS = Object.keys(SOURCES) as GameSfxKind[];

/** Soft enough that a ~0.5s dice tumble isn't a slap in the face on web. */
const VOLUME: Record<GameSfxKind, number> = {
  roll: 0.45,
  place: 0.4,
  hit: 0.5,
  bearOff: 0.42,
  win: 0.48,
};

type NativePlayer = ReturnType<typeof createAudioPlayer>;

type WebGainNode = {
  gain: { value: number };
  connect: (node: unknown) => void;
};

type WebBufferSource = {
  buffer: unknown;
  connect: (node: unknown) => void;
  start: (when?: number) => void;
};

type WebAudioBuffer = unknown;

type WebAudioCtx = {
  state: string;
  resume: () => Promise<void>;
  decodeAudioData: (data: ArrayBuffer) => Promise<WebAudioBuffer>;
  createBufferSource: () => WebBufferSource;
  createGain: () => WebGainNode;
  destination: unknown;
};

type WebAudioWindow = {
  AudioContext?: new () => WebAudioCtx;
  webkitAudioContext?: new () => WebAudioCtx;
};

let ready = false;
let readyPromise: Promise<void> | null = null;
let primedGesture = false;
const nativePlayers = new Map<GameSfxKind, NativePlayer>();
const webBuffers = new Map<GameSfxKind, WebAudioBuffer>();
const webUris = new Map<GameSfxKind, string>();
let webCtx: WebAudioCtx | null = null;

function webAudioContext(): WebAudioCtx | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  if (webCtx) {
    return webCtx;
  }
  const win = window as unknown as WebAudioWindow;
  const Ctor = win.AudioContext ?? win.webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  webCtx = new Ctor();
  return webCtx;
}

/** Must run inside a user-gesture so iOS Safari can resume the context. */
function unlockWebAudio(): void {
  const ctx = webAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

async function resolveUri(kind: GameSfxKind): Promise<string | null> {
  const cached = webUris.get(kind);
  if (cached) {
    return cached;
  }
  const asset = Asset.fromModule(SOURCES[kind]);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    return null;
  }
  webUris.set(kind, uri);
  return uri;
}

async function decodeWebBuffers(): Promise<void> {
  const ctx = webAudioContext();
  if (!ctx) {
    return;
  }
  await Promise.all(KINDS.map(async (kind) => {
    if (webBuffers.has(kind)) {
      return;
    }
    const uri = await resolveUri(kind);
    if (!uri) {
      return;
    }
    const response = await fetch(uri);
    const bytes = await response.arrayBuffer();
    const buffer = await ctx.decodeAudioData(bytes.slice(0));
    webBuffers.set(kind, buffer);
  }));
}

async function warmNativePlayers(): Promise<void> {
  if (nativePlayers.size === KINDS.length) {
    return;
  }
  await setAudioModeAsync({
    playsInSilentMode: false,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
  });
  for (const kind of KINDS) {
    if (nativePlayers.has(kind)) {
      continue;
    }
    const player = createAudioPlayer(SOURCES[kind]);
    player.volume = VOLUME[kind];
    nativePlayers.set(kind, player);
  }
}

/**
 * Decode / create players ahead of the roll or move.
 * Safe to call from a tap handler; no-ops when already warm.
 */
export function ensureGameSfxReady(): Promise<void> {
  unlockWebAudio();
  if (ready) {
    return Promise.resolve();
  }
  if (readyPromise) {
    return readyPromise;
  }
  readyPromise = (async () => {
    try {
      if (Platform.OS === 'web') {
        await decodeWebBuffers();
      }
      else {
        await warmNativePlayers();
      }
      ready = true;
    }
    catch {
      ready = false;
      readyPromise = null;
    }
  })();
  return readyPromise;
}

/** Arm warmup on the next pointer/key so the first roll isn't a cold start. */
export function primeGameSfxFromUserGesture(): void {
  if (primedGesture || Platform.OS !== 'web' || typeof window === 'undefined') {
    if (Platform.OS !== 'web') {
      void ensureGameSfxReady();
    }
    primedGesture = true;
    return;
  }
  primedGesture = true;
  const kick = () => {
    void ensureGameSfxReady();
  };
  window.addEventListener('pointerdown', kick, { once: true, capture: true });
  window.addEventListener('keydown', kick, { once: true, capture: true });
}

function playWebBuffer(kind: GameSfxKind): boolean {
  const ctx = webAudioContext();
  const buffer = webBuffers.get(kind);
  if (!ctx || !buffer) {
    return false;
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = VOLUME[kind];
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);
  return true;
}

function playWebHtmlAudio(kind: GameSfxKind): boolean {
  const uri = webUris.get(kind);
  if (!uri || typeof globalThis.Audio === 'undefined') {
    return false;
  }
  const el = new globalThis.Audio(uri);
  el.preload = 'auto';
  el.volume = VOLUME[kind];
  void el.play();
  return true;
}

function playNative(kind: GameSfxKind): void {
  const player = nativePlayers.get(kind);
  if (!player) {
    return;
  }
  const atStart = player.currentTime === 0 && !player.playing;
  if (atStart) {
    player.play();
    return;
  }
  // Don't await in the caller — fire-and-forget so gameplay isn't blocked.
  void player.seekTo(0).then(() => {
    player.play();
  }).catch(() => {
    // Native seek can fail if the player was released.
  });
}

async function playNow(kind: GameSfxKind): Promise<void> {
  try {
    await ensureGameSfxReady();
    if (Platform.OS === 'web') {
      if (playWebBuffer(kind) || playWebHtmlAudio(kind)) {
        return;
      }
    }
    playNative(kind);
  }
  catch {
    // Mirror haptics — never throw into gameplay.
  }
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

  try {
    void playNow(kind);
  }
  catch {
    // Mirror haptics — never throw into gameplay.
  }
}

export function playGameSfxSequence(kinds: GameSfxKind[]): void {
  kinds.forEach((kind, i) => {
    // Tiny stagger so hit+bearOff don't completely stack as one mush.
    setTimeout(() => playGameSfx(kind), i * 40);
  });
}

/** Test-only: drop warmed players so cases stay isolated. */
export function resetGameSfxForTests(): void {
  ready = false;
  readyPromise = null;
  primedGesture = false;
  nativePlayers.clear();
  webBuffers.clear();
  webUris.clear();
  webCtx = null;
}
