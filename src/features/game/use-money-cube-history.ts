import type { GameState } from '@/lib/game';
import type { CubeHistoryEvent } from '@/lib/game/cube-history';
import type { GameTimeline } from '@/lib/game/game-timeline';
import { useCallback, useRef, useState } from 'react';
import { clearGuidance } from '@/features/game/guidance-store';

function boardKey(state: GameState): string {
  return JSON.stringify([state.points, state.bar, state.borneOff, state.currentPlayer, state.mode]);
}
function decisionKey(state: GameState): string {
  return JSON.stringify([boardKey(state), state.match, state.phase, state.dice, state.remainingDice, state.winner]);
}

/** Cube events live between checker plies; never manufacture checker moves to rewind them. */
function undoGroup(state: GameState | null, events: CubeHistoryEvent[], ply: number): CubeHistoryEvent[] {
  const last = events.at(-1);
  if (!state || state.match?.length !== 0 || !last || last.afterPly !== ply
    || boardKey(state) !== boardKey(last.after) || JSON.stringify(state.match) !== JSON.stringify(last.after.match)) {
    return [];
  }
  const start = events.findLastIndex(event => event.kind === 'offer');
  if (start < 0 || events[start]!.afterPly !== ply)
    return [];
  // Against the computer, take back your answer so you can choose Take or
  // Pass again, rather than leaving a computer-to-roll position waiting on you.
  if (state.mode === 'vs-computer' && events[start]!.player === 'black') {
    const answer = events.findLastIndex(event => event.afterPly === ply && event.player === 'white');
    return answer > start ? events.slice(answer) : [];
  }
  return events.slice(start);
}

type Options = {
  state: GameState | null;
  active: boolean;
  blocked: boolean;
  ply: number;
  events: CubeHistoryEvent[];
  getEvents: () => CubeHistoryEvent[];
  replaceEvents: (events: CubeHistoryEvent[]) => void;
  getState: () => GameState | null;
  getTimeline: () => GameTimeline | null;
  setTimeline: (timeline: GameTimeline | null) => void;
  commitState: (state: GameState) => void;
  prepareHistory: () => void;
};
type Redo = { before: GameState; after: GameState; events: CubeHistoryEvent[]; timeline: GameTimeline | null };

export function useMoneyCubeHistory(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [redo, publishRedo] = useState<Redo[]>([]);
  const redoRef = useRef(redo);
  const commitRedo = useCallback((next: Redo[]) => {
    redoRef.current = next;
    publishRedo(next);
  }, []);
  const reset = useCallback(() => commitRedo([]), [commitRedo]);
  const canRedo = !!options.state && !!redo[0] && redo[0].events[0]!.afterPly === options.ply && decisionKey(options.state) === decisionKey(redo[0].before);
  const canUndo = undoGroup(options.state, options.events, options.ply).length > 0;

  const undo = useCallback(() => {
    const o = latest.current;
    const state = o.getState();
    const group = undoGroup(state, o.getEvents(), o.ply);
    if (!o.active || o.blocked || !state || !group.length)
      return false;
    o.prepareHistory();
    clearGuidance();
    const before = group[0]!.before;
    // Drop old forward history if the player branched after an earlier take-back.
    const tail = redoRef.current[0] && decisionKey(state) === decisionKey(redoRef.current[0].before) ? redoRef.current : [];
    const timeline = o.getTimeline();
    commitRedo([{ before, after: state, events: group, timeline }, ...tail]);
    o.replaceEvents(o.getEvents().slice(0, -group.length));
    if (timeline) {
      const snapshots = timeline.snapshots.slice(0, timeline.cursor + 1);
      snapshots[timeline.cursor] = before;
      o.setTimeline({ ...timeline, snapshots, redo: [], redoMoves: [] });
    }
    o.commitState(before);
    return true;
  }, [commitRedo]);

  const redoAction = useCallback(() => {
    const o = latest.current;
    const record = redoRef.current[0];
    const state = o.getState();
    if (!o.active || o.blocked || !record || !state || record.events[0]!.afterPly !== o.ply || decisionKey(state) !== decisionKey(record.before))
      return false;
    o.prepareHistory();
    clearGuidance();
    commitRedo(redoRef.current.slice(1));
    o.replaceEvents([...o.getEvents(), ...record.events]);
    o.setTimeline(record.timeline);
    o.commitState(record.after);
    return true;
  }, [commitRedo]);
  return { canUndo, canRedo, undo, redo: redoAction, reset };
}
