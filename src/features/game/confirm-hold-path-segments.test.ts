import type { MoveLogEntry } from '@/lib/game/move-log';
import type { GameState, Move } from '@/lib/game/types';

import { applyMove, getLegalMoves } from '@/lib/game';
import { createPositionState } from '@/lib/game/create-position';
import { appendMoveLogEntry } from '@/lib/game/move-log';

import { confirmHoldPathSegments } from './confirm-hold-path-segments';
import { deriveGameBoardPresentation } from './game-board-presentation';

/** White to move with 3-1 from the standard opening-like placement. */
function startState(): GameState {
  return createPositionState({
    currentPlayer: 'white',
    mode: 'vs-computer',
    dice: [3, 1],
    useStandardSetup: true,
  });
}

function play(state: GameState, from: number, to: number): { state: GameState; move: Move } {
  const move = getLegalMoves(state).find(m => m.from === from && m.to === to)!;
  expect(move).toBeDefined();
  return { state: applyMove(state, move, { deferTurnEnd: true }), move };
}

function logAfter(baseline: GameState, moves: { from: number; to: number }[]): {
  state: GameState;
  moveLog: MoveLogEntry[];
} {
  let state = baseline;
  let moveLog: MoveLogEntry[] = [];
  for (const { from, to } of moves) {
    const before = state;
    const played = play(state, from, to);
    state = played.state;
    moveLog = appendMoveLogEntry(moveLog, {
      player: before.currentPlayer,
      dice: before.dice,
      move: played.move,
      after: state,
      before,
    });
  }
  return { state, moveLog };
}

describe('confirmHoldPathSegments', () => {
  it('renders one segment per move while the turn is held', () => {
    const baseline = startState();
    const { moveLog } = logAfter(baseline, [
      { from: 8, to: 5 },
      { from: 6, to: 5 },
    ]);

    const segments = confirmHoldPathSegments({
      awaitingConfirm: true,
      replayBaseline: baseline,
      moveLog,
      currentPlayer: 'white',
    });

    expect(segments).toHaveLength(2);
    expect(segments.map(s => `${s.entry.from}->${s.entry.to}`)).toEqual([
      '8->5',
      '6->5',
    ]);
  });

  it('updates after undo (fewer plies in the held turn)', () => {
    const baseline = startState();
    const { moveLog } = logAfter(baseline, [
      { from: 8, to: 5 },
      { from: 6, to: 5 },
    ]);

    const afterUndo = confirmHoldPathSegments({
      awaitingConfirm: true,
      replayBaseline: baseline,
      moveLog: moveLog.slice(0, 1),
      currentPlayer: 'white',
    });

    expect(afterUndo).toHaveLength(1);
    expect(afterUndo[0]!.entry.from).toBe(8);
    expect(afterUndo[0]!.entry.to).toBe(5);
  });

  it('clears when confirm ends the hold', () => {
    const baseline = startState();
    const { moveLog } = logAfter(baseline, [{ from: 8, to: 5 }, { from: 6, to: 5 }]);

    expect(confirmHoldPathSegments({
      awaitingConfirm: false,
      replayBaseline: baseline,
      moveLog,
      currentPlayer: 'white',
    })).toEqual([]);
  });

  it('is absent when Confirm move is off (caller not awaiting)', () => {
    const baseline = startState();
    const { moveLog } = logAfter(baseline, [{ from: 8, to: 5 }, { from: 6, to: 5 }]);

    // Setting off → isAwaitingMoveConfirm is false → awaitingConfirm false.
    expect(confirmHoldPathSegments({
      awaitingConfirm: false,
      replayBaseline: baseline,
      moveLog,
    })).toEqual([]);
  });

  it('clears when the last turn belongs to the opponent', () => {
    const baseline = startState();
    const { moveLog } = logAfter(baseline, [{ from: 8, to: 5 }, { from: 6, to: 5 }]);

    expect(confirmHoldPathSegments({
      awaitingConfirm: true,
      replayBaseline: baseline,
      moveLog,
      currentPlayer: 'black',
    })).toEqual([]);
  });
});

describe('deriveGameBoardPresentation confirm-hold', () => {
  const emptyReview = {
    isReviewing: false,
    displayState: startState(),
    reviewAnimation: null,
    pathSegments: [] as never[],
  };

  it('shows confirm-hold segments when not reviewing and no history path', () => {
    const baseline = startState();
    const { moveLog } = logAfter(baseline, [{ from: 8, to: 5 }, { from: 6, to: 5 }]);
    const hold = confirmHoldPathSegments({
      awaitingConfirm: true,
      replayBaseline: baseline,
      moveLog,
      currentPlayer: 'white',
    });

    const board = deriveGameBoardPresentation(emptyReview, null, { historyPath: null, confirmHoldSegments: hold });
    expect(board.pathSegments).toHaveLength(2);
    expect(board.pathFadeOutMs).toBeUndefined();
  });

  it('prefers undo/redo historyPath over confirm-hold (no double arrows)', () => {
    const baseline = startState();
    const { moveLog } = logAfter(baseline, [{ from: 8, to: 5 }, { from: 6, to: 5 }]);
    const hold = confirmHoldPathSegments({
      awaitingConfirm: true,
      replayBaseline: baseline,
      moveLog,
      currentPlayer: 'white',
    });
    const historyPath = {
      entry: moveLog[1]!,
      beforeState: hold[1]!.beforeState,
    };

    const board = deriveGameBoardPresentation(emptyReview, null, { historyPath, confirmHoldSegments: hold });
    expect(board.pathSegments).toHaveLength(1);
    expect(board.pathSegments[0]!.entry.ply).toBe(moveLog[1]!.ply);
  });
});
