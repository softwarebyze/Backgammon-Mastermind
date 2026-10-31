import type { MoveLogTurn } from './move-log';
import type { GameState, Player } from './types';

/** Events live BETWEEN checker plies. They never consume an undo/timeline ply. */
export type CubeHistoryEvent = {
  id: number;
  kind: 'offer' | 'accept' | 'drop';
  player: Player;
  /** Number of checker/no-move entries preceding this event. */
  afterPly: number;
  before: GameState;
  after: GameState;
};

// eslint-disable-next-line max-params -- explicit transition context
export function appendCubeHistoryEvent(
  events: CubeHistoryEvent[],
  kind: CubeHistoryEvent['kind'],
  before: GameState,
  after: GameState,
  afterPly: number,
): CubeHistoryEvent[] {
  if (before === after || !before.match || !after.match)
    return events;
  // Retained callbacks can fire twice in a single React batch. A binding
  // transition from the same immutable source state is still one event.
  const last = events.at(-1);
  if (last?.kind === kind && last.before === before)
    return events;
  const offerer = before.match.pendingOffer;
  return [...events, {
    id: (events.at(-1)?.id ?? 0) + 1,
    kind,
    player: kind === 'offer' ? before.currentPlayer : offerer === 'white' ? 'black' : 'white',
    afterPly,
    before,
    after,
  }];
}

export type HistoryItem = { kind: 'turn'; turn: MoveLogTurn } | { kind: 'cube'; event: CubeHistoryEvent };

/** A cube action at N belongs after turn N and before the next revealed roll. */
export function chronologicalHistory(turns: MoveLogTurn[], events: CubeHistoryEvent[]): HistoryItem[] {
  return [
    ...turns.map(turn => ({ kind: 'turn' as const, turn })),
    ...events.map(event => ({ kind: 'cube' as const, event })),
  ].sort((a, b) => {
    const plyA = a.kind === 'turn' ? a.turn.endPly : a.event.afterPly;
    const plyB = b.kind === 'turn' ? b.turn.endPly : b.event.afterPly;
    return plyA - plyB || (a.kind === 'turn' ? -1 : b.kind === 'turn' ? 1 : a.event.id - b.event.id);
  });
}
