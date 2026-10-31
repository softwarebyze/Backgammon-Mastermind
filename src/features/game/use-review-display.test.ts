import { useReviewDisplayState } from '@/features/game/use-review-display';
import { applyDiceRoll, applyMove, createPositionState, getLegalMoves } from '@/lib/game';
import { appendCubeHistoryEvent } from '@/lib/game/cube-history';
import { acceptDouble, createMatch, offerDouble } from '@/lib/game/match';
import { appendMoveLogEntry } from '@/lib/game/move-log';
import { renderHook } from '@/lib/test-utils';

it('keeps the accepted cube in the pre-move replay frame without revealing a later win', () => {
  const before = createPositionState({ mode: 'vs-human', match: createMatch(3), placements: [{ player: 'white', point: 1, count: 1 }, { player: 'black', point: 24, count: 14 }], borneOff: { white: 14, black: 1 } });
  const offered = offerDouble(before, 0);
  const taken = acceptDouble(offered);
  const cubeEvents = appendCubeHistoryEvent(appendCubeHistoryEvent([], 'offer', before, offered, 0), 'accept', offered, taken, 0);
  const rolled = applyDiceRoll(taken, [3, 1]);
  const move = getLegalMoves(rolled)[0]!;
  const after = applyMove(rolled, move);
  const moveLog = appendMoveLogEntry([], { player: 'white', dice: [3, 1], before: rolled, move, after });
  const options = { liveState: after, replayBaseline: before, moveLog, cubeEvents, isReviewing: true, displayPly: 0, highlightMovePly: 1, presenterPly: 1 };
  const view = renderHook((props: typeof options) => useReviewDisplayState(props), { initialProps: options });
  expect(after.match?.score.white).toBe(2);
  expect(view.result.current.displayState?.match?.cube).toEqual({ value: 2, owner: 'black' });
  expect(view.result.current.displayState?.match?.score.white).toBe(0);
  expect(view.result.current.displayState?.match?.result).toBeNull();
  view.rerender({ ...options, presenterPly: 0 });
  expect(view.result.current.displayState?.match?.cube).toEqual({ value: 1, owner: 'center' });
});
