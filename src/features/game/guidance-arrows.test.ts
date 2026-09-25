import type { GuidanceSession } from './guidance-store';
import type { MoveLogEntry } from '@/lib/game/move-log';
import type { GameState, Move } from '@/lib/game/types';

import { applyMove, getLegalMoves } from '@/lib/game';
import { createPositionState } from '@/lib/game/create-position';

import { guidanceArrowSegments } from './guidance-arrows';

/**
 * White to move with 3-1. Suggested continuation: 13/10 (the 3), then 8/7
 * (the 1) — both legal from the start position.
 */
function startState(): GameState {
  return createPositionState({
    currentPlayer: 'white',
    mode: 'vs-computer',
    dice: [3, 1],
    placements: [
      { point: 24, player: 'white', count: 2 },
      { point: 13, player: 'white', count: 5 },
      { point: 8, player: 'white', count: 3 },
      { point: 6, player: 'white', count: 5 },
      { point: 1, player: 'black', count: 2 },
      { point: 12, player: 'black', count: 5 },
      { point: 17, player: 'black', count: 3 },
      { point: 19, player: 'black', count: 5 },
    ],
  });
}

const SUGGESTED: Move[] = [
  { from: 13, to: 10, dieIndex: 0 },
  { from: 8, to: 7, dieIndex: 1 },
];

function hintSession(question: GameState): GuidanceSession {
  return {
    id: 1,
    kind: 'hint',
    questionState: question,
    myMoves: [],
    engineMoves: SUGGESTED,
    revealed: true,
    showMine: false,
    showEngine: true,
    engineId: 'bgsage',
    hintMoveLogLength: 0,
  };
}

function blunderSession(question: GameState, revealed: boolean): GuidanceSession {
  return {
    id: 2,
    kind: 'blunder',
    questionState: question,
    myMoves: [{ from: 6, to: 5, dieIndex: 1 }],
    engineMoves: [{ from: 13, to: 10, dieIndex: 0 }],
    revealed,
    showMine: true,
    showEngine: true,
    verdict: {
      loss: 0.12,
      playedRank: 2,
      candidateCount: 8,
      candidateEquities: [0.5, 0.38],
      bestEquity: 0.5,
    },
  };
}

/** Apply a from/to move the way the app does (re-resolves legal moves). */
function playMove(state: GameState, from: number, to: number): { state: GameState; entry: MoveLogEntry } {
  const legal = getLegalMoves(state).find(m => m.from === from && m.to === to)!;
  expect(legal).toBeDefined();
  const next = applyMove(state, legal);
  const entry: MoveLogEntry = {
    ply: 1,
    player: state.currentPlayer,
    dice: state.dice,
    from: legal.from,
    to: legal.to,
  };
  return { state: next, entry };
}

describe('guidanceArrowSegments', () => {
  it('returns nothing without a session or live state', () => {
    const s = startState();
    expect(guidanceArrowSegments(null, s, [])).toEqual([]);
    expect(guidanceArrowSegments(hintSession(s), null, [])).toEqual([]);
  });

  it('draws the full hint continuation before anything is played', () => {
    const s = startState();
    const segments = guidanceArrowSegments(hintSession(s), s, []);
    expect(segments).toHaveLength(2);
    expect(segments.map(seg => seg.entry.from)).toEqual([13, 8]);
    expect(segments.map(seg => seg.tone)).toEqual(['engine', 'engine']);
  });

  it('drops completed hint arrows as the player follows the suggestion', () => {
    const s = startState();
    const session = hintSession(s);
    const { state: afterFirst, entry } = playMove(s, 13, 10);
    const segments = guidanceArrowSegments(session, afterFirst, [entry]);
    // 13/10 was played — only the 8/7 continuation remains, re-resolved
    // against the live position.
    expect(segments).toHaveLength(1);
    expect(segments[0].entry.from).toBe(8);
    expect(segments[0].entry.to).toBe(7);
    expect(segments[0].tone).toBe('engine');
  });

  it('restores hint arrows on undo', () => {
    const s = startState();
    const session = hintSession(s);
    const { state: afterFirst, entry } = playMove(s, 13, 10);
    expect(guidanceArrowSegments(session, afterFirst, [entry])).toHaveLength(1);
    // Undo: the move log shrinks back — both arrows return.
    expect(guidanceArrowSegments(session, s, [])).toHaveLength(2);
  });

  it('clears the suggestion when the player deviates onto a dead line', () => {
    const s = startState();
    const session = hintSession(s);
    // Player plays 6/3 (the 3) instead of the suggested 13/10. The planned
    // 13/10 is no longer legal with the remaining die, so the suggestion —
    // made for a position that no longer exists — degrades to nothing
    // rather than pointing somewhere wrong. The player can ask again.
    const { state: deviated, entry } = playMove(s, 6, 3);
    expect(guidanceArrowSegments(session, deviated, [entry])).toEqual([]);
  });

  it('keeps the remaining plan when the player just reorders moves', () => {
    const s = startState();
    const session = hintSession(s);
    // Player plays the suggested 8/7 first (the 1) — same resulting
    // position as the plan, different order. The 13/10 arrow stays.
    const { state: reordered, entry } = playMove(s, 8, 7);
    const segments = guidanceArrowSegments(session, reordered, [entry]);
    expect(segments).toHaveLength(1);
    expect(segments[0].entry.from).toBe(13);
    expect(segments[0].entry.to).toBe(10);
    expect(segments[0].tone).toBe('engine');
  });

  it('draws nothing for an unrevealed blunder session', () => {
    const s = startState();
    expect(guidanceArrowSegments(blunderSession(s, false), s, [])).toEqual([]);
  });

  it('draws both paths with distinct tones in the revealed solution view', () => {
    const s = startState();
    const segments = guidanceArrowSegments(blunderSession(s, true), s, []);
    expect(segments).toHaveLength(2);
    const tones = segments.map(seg => seg.tone).sort();
    expect(tones).toEqual(['engine', 'mine']);
  });

  it('respects the path visibility toggles', () => {
    const s = startState();
    const session = blunderSession(s, true);
    const mineOnly = guidanceArrowSegments({ ...session, showEngine: false }, s, []);
    expect(mineOnly).toHaveLength(1);
    expect(mineOnly[0].tone).toBe('mine');
    const sageOnly = guidanceArrowSegments({ ...session, showMine: false }, s, []);
    expect(sageOnly).toHaveLength(1);
    expect(sageOnly[0].tone).toBe('engine');
  });

  it('blunder arrows draw from the turn-start question state', () => {
    const s = startState();
    const session = blunderSession(s, true);
    // Even if the live board has moved on, the solution preview arrows are
    // anchored to the question state's board (the modal shows that board).
    const { state: movedOn } = playMove(s, 13, 10);
    const segments = guidanceArrowSegments(session, movedOn, []);
    expect(segments).toHaveLength(2);
    expect(segments[0].beforeState).toBe(session.questionState);
  });
});
