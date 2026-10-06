import type { ComputerLevel, SageLevelConfig } from '../src/features/game/engine/sage-difficulty';
import type { GameState, Player } from '../src/lib/game/types';
import { SAGE_LEVELS } from '../src/features/game/engine/sage-difficulty';

export type BenchSideConfig = SageLevelConfig & { lookahead?: boolean };

export type BenchTally = {
  aWins: number;
  aPoints: number;
  scored: number;
  capped: number;
};

/** Classic is null (play the heuristic). Anything else is a Sage config. */
export function parseBenchSide(side: string): BenchSideConfig | null {
  if (side === 'classic')
    return null;
  if (side === 'lookahead')
    return { ply: 1, temperature: 0, lookahead: true };
  const m = /^(p2)?t([\d.]+)$/.exec(side);
  if (m) {
    const temperature = Number(m[2]);
    if (Number.isFinite(temperature))
      return { ply: m[1] ? 2 : 1, temperature };
  }
  const config = SAGE_LEVELS[side as Exclude<ComputerLevel, 'classic'>];
  if (!config)
    throw new Error(`Unknown Sage level: ${side}`);
  return config;
}

export function emptyBenchTally(): BenchTally {
  return { aWins: 0, aPoints: 0, scored: 0, capped: 0 };
}

/** Points for a finished game. Null when the game never produced a winner. */
export function scoreBenchGame(state: Pick<GameState, 'winner' | 'borneOff' | 'bar' | 'points'>): { winner: Player; points: number } | null {
  const winner = state.winner;
  if (!winner)
    return null;
  const loser: Player = winner === 'white' ? 'black' : 'white';
  let points = 1;
  if (state.borneOff[loser] === 0) {
    points = 2;
    const winnerHome = winner === 'white' ? [1, 6] : [19, 24];
    let inHome = state.bar[loser] > 0;
    for (let p = winnerHome[0]; p <= winnerHome[1]; p++) {
      if (state.points[p]?.player === loser)
        inHome = true;
    }
    if (inHome)
      points = 3;
  }
  return { winner, points };
}

export function applyBenchResult(
  tally: BenchTally,
  score: { winner: Player; points: number } | null,
  aIsWhite: boolean,
) {
  if (!score) {
    tally.capped++;
    return;
  }
  tally.scored++;
  const aWon = (score.winner === 'white') === aIsWhite;
  if (aWon)
    tally.aWins++;
  tally.aPoints += aWon ? score.points : -score.points;
}
