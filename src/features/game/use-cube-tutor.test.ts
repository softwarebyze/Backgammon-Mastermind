import type { GameEngine } from './engine';
import { act, renderHook } from '@testing-library/react-native';
import { createPositionState } from '@/lib/game/create-position';
import { createMatch, offerDouble } from '@/lib/game/match';
import { useCubeTutor } from './use-cube-tutor';

const analyzeCube = jest.fn();
const engine: GameEngine = { id: 'test', planTurn: jest.fn(), boardAfterTurn: jest.fn(), analyzeCube };
const verdict = { shouldDouble: true, shouldTake: true, shouldBeaver: false, equityNoDouble: 0.3, equityDoubleTake: 0.7, equityDoublePass: 1 };
const state = createPositionState({ useStandardSetup: true, match: createMatch(0) });
const options = { state, enabled: true, active: true, blocked: false, engine };
beforeEach(() => analyzeCube.mockReset().mockResolvedValue(verdict));

it('commits a missed double at once, then reviews it with the size of the mistake', async () => {
  const { result } = renderHook(() => useCubeTutor(options));
  const commit = jest.fn();
  await act(async () => result.current.run(state, 'roll', commit));
  expect(commit).toHaveBeenCalledTimes(1);
  expect(result.current.session).toMatchObject({ phase: 'mistake', attempted: 'roll', analysis: { best: 'offer' } });
  expect(result.current.session?.loss).toBeCloseTo(0.4);
  act(() => result.current.dismiss());
  expect(result.current.session).toBeNull();
});
it('holds a double while it checks, then applies a sound one by itself', async () => {
  let resolve!: (value: typeof verdict) => void;
  analyzeCube.mockImplementation(() => new Promise(r => resolve = r));
  const { result } = renderHook(() => useCubeTutor(options));
  const commit = jest.fn();
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.run(state, 'offer', commit);
  });
  expect(commit).not.toHaveBeenCalled();
  expect(result.current.session?.phase).toBe('checking');
  await act(async () => {
    resolve(verdict);
    await pending;
  });
  expect(commit).toHaveBeenCalledTimes(1);
  expect(result.current.session).toBeNull();
});

describe('a costly double, take or pass waits on the review card', () => {
  const tooSoon = { shouldDouble: false, shouldTake: true, shouldBeaver: false, equityNoDouble: 0.6, equityDoubleTake: 0.4, equityDoublePass: 1 };

  it('is not applied until kept, and Keep applies it once', async () => {
    analyzeCube.mockResolvedValue(tooSoon);
    const { result } = renderHook(() => useCubeTutor(options));
    const commit = jest.fn();
    await act(async () => result.current.run(state, 'offer', commit));
    expect(result.current.session).toMatchObject({ phase: 'mistake', attempted: 'offer' });
    expect(commit).not.toHaveBeenCalled();
    act(() => result.current.keep());
    act(() => result.current.keep());
    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.session).toBeNull();
  });

  it('is never applied when taken back, so the player decides again', async () => {
    analyzeCube.mockResolvedValue(tooSoon);
    const { result } = renderHook(() => useCubeTutor(options));
    const commit = jest.fn();
    await act(async () => result.current.run(state, 'offer', commit));
    act(() => result.current.takeBack());
    act(() => result.current.keep());
    expect(commit).not.toHaveBeenCalled();
    expect(result.current.session).toBeNull();
  });

  it('goes through when the check fails, so the game never stalls', async () => {
    analyzeCube.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useCubeTutor(options));
    const commit = jest.fn();
    await act(async () => result.current.run(state, 'offer', commit));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.session).toBeNull();
  });
});
it('checks a bad pass from the responder’s perspective', async () => {
  const offered = offerDouble(state, 0);
  const { result } = renderHook(() => useCubeTutor({ ...options, state: offered }));
  await act(async () => result.current.run(offered, 'drop', jest.fn()));
  expect(result.current.session).toMatchObject({ phase: 'mistake', attempted: 'drop' });
});
it('never holds the game when the check fails', async () => {
  analyzeCube.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useCubeTutor(options));
  const commit = jest.fn();
  await act(async () => result.current.run(state, 'roll', commit));
  expect(commit).toHaveBeenCalledTimes(1);
  expect(result.current.session).toBeNull();
});
it('drops a check that answers after the game was left', async () => {
  let resolve!: (value: typeof verdict) => void;
  analyzeCube.mockImplementation(() => new Promise(r => resolve = r));
  const { result, rerender } = renderHook((props: typeof options) => useCubeTutor(props), { initialProps: options });
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.run(state, 'roll', jest.fn());
  });
  rerender({ ...options, active: false });
  await act(async () => {
    resolve(verdict);
    await pending;
  });
  expect(result.current.session).toBeNull();
});
it('does not analyze with Tutor off', async () => {
  const { result } = renderHook(() => useCubeTutor({ ...options, enabled: false }));
  const commit = jest.fn();
  await act(async () => result.current.run(state, 'roll', commit));
  expect(commit).toHaveBeenCalledTimes(1);
  expect(analyzeCube).not.toHaveBeenCalled();
});
