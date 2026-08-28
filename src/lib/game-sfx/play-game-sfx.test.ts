import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { loadGamePreferences } from '@/lib/game-preferences/storage';
import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import {
  ensureGameSfxReady,
  playGameSfx,
  playGameSfxSequence,
  resetGameSfxForTests,
} from '@/lib/game-sfx/play-game-sfx';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn(async () => undefined),
      uri: 'https://example.test/roll.wav',
      localUri: null,
    })),
  },
}));

jest.mock('@/lib/game-preferences/storage', () => ({
  loadGamePreferences: jest.fn(),
}));

const loadPrefs = loadGamePreferences as jest.MockedFunction<typeof loadGamePreferences>;
const createPlayer = createAudioPlayer as jest.MockedFunction<typeof createAudioPlayer>;
const setMode = setAudioModeAsync as jest.MockedFunction<typeof setAudioModeAsync>;

function mockPlayer() {
  return {
    volume: 1,
    currentTime: 0,
    playing: false,
    seekTo: jest.fn(async () => undefined),
    play: jest.fn(),
  };
}

describe('playGameSfx', () => {
  beforeEach(() => {
    resetGameSfxForTests();
    jest.clearAllMocks();
    loadPrefs.mockReturnValue({ ...DEFAULT_GAME_PREFERENCES, soundEnabled: true });
    createPlayer.mockImplementation(() => mockPlayer() as never);
  });

  it('does not throw when audio setup fails', async () => {
    setMode.mockRejectedValueOnce(new Error('no audio session'));
    expect(() => playGameSfx('roll')).not.toThrow();
    await ensureGameSfxReady();
    expect(() => playGameSfx('place')).not.toThrow();
  });

  it('can be warmed with ensureGameSfxReady before the first play', async () => {
    await ensureGameSfxReady();
    expect(setMode).toHaveBeenCalledWith({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });
    expect(createPlayer).toHaveBeenCalledTimes(5);

    playGameSfx('roll');
    await ensureGameSfxReady();
    await Promise.resolve();
    await Promise.resolve();
    expect(createPlayer).toHaveBeenCalledTimes(5);
    const first = createPlayer.mock.results[0]?.value as ReturnType<typeof mockPlayer>;
    expect(first.play).toHaveBeenCalled();
    expect(first.seekTo).not.toHaveBeenCalled();
  });

  it('no-ops when sound is disabled', () => {
    loadPrefs.mockReturnValue({ ...DEFAULT_GAME_PREFERENCES, soundEnabled: false });
    playGameSfx('hit');
    expect(createPlayer).not.toHaveBeenCalled();
  });

  it('playGameSfxSequence does not throw', () => {
    expect(() => playGameSfxSequence(['hit', 'bearOff'])).not.toThrow();
  });
});
