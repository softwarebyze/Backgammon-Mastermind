import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { ensureTimerSfxReady, playTimerSfx, resetTimerSfxForTests } from './timer-sfx';

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(), setAudioModeAsync: jest.fn().mockResolvedValue(undefined) }));

beforeEach(() => {
  resetTimerSfxForTests();
  jest.clearAllMocks();
});

it('warms and reuses the clock sounds with restrained volume', () => {
  const player = { volume: 0, currentTime: 0, playing: false, play: jest.fn(), remove: jest.fn() };
  jest.mocked(createAudioPlayer).mockReturnValue(player as unknown as ReturnType<typeof createAudioPlayer>);
  ensureTimerSfxReady();
  playTimerSfx('click');
  playTimerSfx('warn');
  expect(createAudioPlayer).toHaveBeenCalledTimes(3);
  expect(player.play).toHaveBeenCalledTimes(2);
  expect(setAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({ playsInSilentMode: false }));
});

it('keeps clock interaction usable when audio initialization fails', () => {
  jest.mocked(createAudioPlayer).mockImplementation(() => {
    throw new Error('audio unavailable');
  });
  expect(() => ensureTimerSfxReady()).not.toThrow();
  expect(() => playTimerSfx('timeout')).not.toThrow();
});
