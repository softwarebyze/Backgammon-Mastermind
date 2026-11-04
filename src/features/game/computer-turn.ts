import type { CubeAnalysis, CubeDecision } from './cube-analysis';
import type { GameEngine } from './engine';
import type { ComputerLevel, GameState, Move } from '@/lib/game';

import { chooseAtLevel, COMPUTER_LEVEL_SETTINGS } from '@/lib/game';
import { primaryEngine } from './engine';

/**
 * The whole turn the computer plays at this level, each move carrying the
 * die it spends so it can be played one checker at a time. Throws when the
 * engine cannot answer; the caller falls back to the built-in heuristic.
 */
export async function planComputerTurn(
  state: GameState,
  level: ComputerLevel,
  { engine = primaryEngine, random = Math.random }: { engine?: GameEngine; random?: () => number } = {},
): Promise<Move[]> {
  const plan = await engine.planTurn(state, { ply: COMPUTER_LEVEL_SETTINGS[level].ply });
  const chosen = engine.movesToCandidate
    ? chooseAtLevel(plan.candidates.map(c => ({ option: c, equity: c.equity })), level, random)
    : plan.candidates[0];
  const moves = chosen === plan.candidates[0] ? plan.moves : engine.movesToCandidate!(state, chosen);
  return moves.map(m => ({ ...m, die: m.die ?? state.remainingDice[m.dieIndex] }));
}

/** The cube action the computer takes at this level, from the engine's values. */
export function chooseComputerCubeAction(
  analysis: CubeAnalysis,
  level: ComputerLevel,
  random: () => number = Math.random,
): CubeDecision {
  if (COMPUTER_LEVEL_SETTINGS[level].noise === 0)
    return analysis.best;
  const options = (Object.entries(analysis.values) as [CubeDecision, number][])
    .filter(([, equity]) => Number.isFinite(equity))
    .map(([option, equity]) => ({ option, equity }));
  return options.length === 0 ? analysis.best : chooseAtLevel(options, level, random);
}
