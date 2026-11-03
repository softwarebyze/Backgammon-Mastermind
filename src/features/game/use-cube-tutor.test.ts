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
it('catches a missed double before rolling, reveals advice, and commits only on Continue', async () => {
  const { result } = renderHook(() => useCubeTutor(options));
  const commit = jest.fn();
  await act(async () => result.current.run(state, 'roll', commit));
  expect(commit).not.toHaveBeenCalled();
  expect(result.current.session).toMatchObject({ phase: 'mistake', analysis: { best: 'offer' }, revealed: false });
  act(() => result.current.reveal());
  expect(result.current.session?.revealed).toBe(true);
  act(() => result.current.proceed());
  expect(commit).toHaveBeenCalledTimes(1);
  expect(result.current.session).toBeNull();
});
it('allows the best choice without a warning', async () => {
  const { result } = renderHook(() => useCubeTutor(options));
  const commit = jest.fn();
  await act(async () => result.current.run(state, 'offer', commit));
  expect(commit).toHaveBeenCalledTimes(1);
  expect(result.current.session).toBeNull();
});
it('checks a bad pass from the responder’s perspective', async () => {
  const offered = offerDouble(state, 0);
  const { result } = renderHook(() => useCubeTutor({ ...options, state: offered }));
  const commit = jest.fn();
  await act(async () => result.current.run(offered, 'drop', commit));
  expect(result.current.session?.phase).toBe('mistake');
  act(() => result.current.cancel());
  expect(commit).not.toHaveBeenCalled();
});
it('retries analysis errors without committing the choice', async () => {
  analyzeCube.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useCubeTutor(options));
  const commit = jest.fn();
  await act(async () => result.current.run(state, 'offer', commit));
  expect(result.current.session?.phase).toBe('error');
  await act(async () => result.current.retry());
  expect(commit).toHaveBeenCalledTimes(1);
});
it('ignores a result after cancellation or a position change', async () => {
  let resolve!: (value: typeof verdict) => void;
  analyzeCube.mockImplementation(() => new Promise(r => resolve = r));
  const { result, rerender } = renderHook((props: typeof options) => useCubeTutor(props), { initialProps: options });
  const commit = jest.fn();
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.run(state, 'offer', commit);
  });
  rerender({ ...options, state: { ...state } });
  await act(async () => {
    resolve(verdict);
    await pending;
  });
  expect(commit).not.toHaveBeenCalled();
  expect(result.current.session).toBeNull();
});
it('does not analyze with Tutor off', async () => {
  const { result } = renderHook(() => useCubeTutor({ ...options, enabled: false }));
  const commit = jest.fn();
  await act(async () => result.current.run(state, 'roll', commit));
  expect(commit).toHaveBeenCalledTimes(1);
  expect(analyzeCube).not.toHaveBeenCalled();
});
