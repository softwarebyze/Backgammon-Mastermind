import type { PathSegment } from './components/board/move-path-overlay';
import type { GuidanceSession } from './guidance-store';
import type { MoveLogEntry } from '@/lib/game/move-log';

import type { GameState } from '@/lib/game/types';
import { hintMovesToSegments } from './hint-arrows';

/**
 * Derive the board overlay arrows from the open guidance session, the live
 * position, and the move log — on every render, never stored. Deriving
 * (rather than storing) is what lets mid-turn hint arrows follow the player:
 * moves already played are dropped, the rest re-resolve against the live
 * position, and undo correctly re-shows arrows.
 */
export function guidanceArrowSegments(
  session: GuidanceSession | null,
  liveState: GameState | null,
  moveLog: MoveLogEntry[],
): PathSegment[] {
  if (!session || !liveState)
    return [];

  if (session.kind === 'hint') {
    // Drop the suggestion prefix the player has already played (matched by
    // from/to against moves made after the request); re-resolve the rest
    // against the live position. hintMovesToSegments stops at the first
    // move that isn't legal, so deviating degrades gracefully.
    const since = session.hintMoveLogLength ?? moveLog.length;
    const playedAfter = moveLog.slice(since);
    let matched = 0;
    while (matched < session.engineMoves.length && matched < playedAfter.length) {
      const suggested = session.engineMoves[matched];
      const played = playedAfter[matched];
      if (played.from === suggested.from && played.to === suggested.to)
        matched++;
      else
        break;
    }
    if (!session.showEngine)
      return [];
    return hintMovesToSegments(session.engineMoves.slice(matched), liveState, 'engine');
  }

  // Blunder: arrows only in the revealed solution view, drawn as full-turn
  // paths from the turn-start question state (the board shows a display-only
  // preview of it — see game-screen).
  if (!session.revealed)
    return [];
  const segments: PathSegment[] = [];
  if (session.showMine)
    segments.push(...hintMovesToSegments(session.myMoves, session.questionState, 'mine'));
  if (session.showEngine)
    segments.push(...hintMovesToSegments(session.engineMoves, session.questionState, 'engine'));
  return segments;
}
