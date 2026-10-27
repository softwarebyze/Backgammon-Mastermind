import { createPositionState, getLegalMoves } from '@/lib/game';
import { createMatch } from '@/lib/game/match';
import { loadPersistedGame } from '@/lib/game/persistence';
import { act, renderHook } from '@/lib/test-utils';
import { useGameProviderValue } from './use-game-provider-value';

function board() {
  return createPositionState({ useStandardSetup: true, mode: 'vs-human', match: createMatch(5) });
}

describe('provider match binding decisions', () => {
  it('resumes a pending offer, blocks roll/undo, and gives the cube to the acceptor', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => result.current.startFromPosition(board()));
    act(() => result.current.matchAction!('offer'));
    const pending = result.current.state;
    act(() => result.current.doRollDice());
    expect(result.current.state).toBe(pending);
    expect(result.current.canUndo).toBe(false);
    expect(loadPersistedGame()?.match?.pendingOffer).toBe('white');
    act(() => result.current.matchAction!('accept'));
    expect(result.current.state?.match?.cube).toEqual({ value: 2, owner: 'black' });
    act(() => result.current.doRollDice());
    const dice = result.current.state!.dice;
    act(() => result.current.doMove(getLegalMoves(result.current.state!)[0]!));
    act(() => result.current.moveAnimation?.onFinish?.());
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.doUndo());
    act(() => result.current.moveAnimation?.onFinish?.());
    expect(result.current.state?.dice).toEqual(dice);
    expect(result.current.state?.match?.cube).toEqual({ value: 2, owner: 'black' });
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.doRollDice());
    expect(result.current.state?.dice).toEqual(dice);
    act(() => result.current.doRedo());
    act(() => result.current.moveAnimation?.onFinish?.());
    expect(result.current.state?.match?.cube.owner).toBe('black');
  });
  it('a new revealed roll prevents undo into the previous turn', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    const state = createPositionState({ mode: 'vs-human', match: createMatch(5), dice: [1, 2], placements: [{ point: 2, player: 'white', count: 15 }, { point: 24, player: 'black', count: 15 }] });
    act(() => result.current.startFromPosition(state));
    for (let i = 0; i < 2; i++) {
      act(() => result.current.doMove(getLegalMoves(result.current.state!)[0]!));
      act(() => result.current.moveAnimation?.onFinish?.());
    }
    act(() => result.current.doPassTurn());
    expect(result.current.state?.phase).toBe('rolling');
    act(() => result.current.doRollDice());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.state?.match?.undoFloor).toBe(2);
    act(() => result.current.doUndo());
    expect(result.current.state?.currentPlayer).toBe('black');
  });
  it('drop -> resume between games -> next game retains score and resets history', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => result.current.startFromPosition(board()));
    act(() => result.current.matchAction!('offer'));
    act(() => result.current.matchAction!('drop'));
    expect(loadPersistedGame()?.match?.score.white).toBe(1);
    act(() => result.current.matchAction!('next'));
    expect(result.current.state?.match?.score.white).toBe(1);
    expect(result.current.state?.phase).toBe('opening-roll');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.moveLog).toHaveLength(0);
  });
});

// Reviewer counterexample: the pass belongs to the binding roll, while the
// checker move before it belongs to the previous turn.
it.each([false, true])('does not undo across accepted cube + blocked roll (cold resume: %s)', (resume) => {
  let utils = renderHook(() => useGameProviderValue(true));
  const state = createPositionState({ mode: 'vs-human', match: createMatch(5), dice: [3, 4], placements: [{ point: 1, player: 'white', count: 2 }, { point: 2, player: 'white', count: 2 }, { point: 6, player: 'white', count: 11 }, { point: 24, player: 'black', count: 14 }], bar: { black: 1 } });
  act(() => utils.result.current.startFromPosition(state));
  for (const to of [3, 2]) {
    act(() => utils.result.current.doMove(getLegalMoves(utils.result.current.state!).find(m => m.from === 6 && m.to === to)!));
    act(() => utils.result.current.moveAnimation?.onFinish?.());
  }
  if (utils.result.current.state!.phase === 'moving')
    act(() => utils.result.current.doPassTurn());
  act(() => utils.result.current.matchAction!('offer'));
  act(() => utils.result.current.matchAction!('accept'));
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.01);
  act(() => utils.result.current.doRollDice());
  random.mockRestore();
  expect(utils.result.current.state!.phase).toBe('no-move');
  act(() => utils.result.current.doPassTurn());
  if (resume) {
    utils.unmount();
    utils = renderHook(() => useGameProviderValue(true));
    act(() => {
      expect(utils.result.current.resumeGame()).toBe(true);
    });
  }
  expect(utils.result.current.moveLog).toHaveLength(3);
  expect(utils.result.current.state!.match!.undoFloor).toBe(2);
  expect(utils.result.current.state!.match!.cube).toEqual({ value: 2, owner: 'white' });
  expect(utils.result.current.canUndo).toBe(false);
  const before = utils.result.current.state;
  const log = utils.result.current.moveLog;
  act(() => utils.result.current.doUndo());
  act(() => utils.result.current.moveAnimation?.onFinish?.());
  expect(utils.result.current.state).toBe(before);
  expect(utils.result.current.moveLog).toEqual(log);
  expect(utils.result.current.moveAnimation).toBeNull();
  expect(utils.result.current.historyPath).toBeNull();
  expect(utils.result.current.canRedo).toBe(false);
  utils.unmount();
});
