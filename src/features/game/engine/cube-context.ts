import type { SageCubeContext } from 'expo-bgsage';
import type { GameState } from '@/lib/game';

export function engineCubeContext(state: GameState): SageCubeContext | undefined {
  const m = state.match;
  if (!m)
    return undefined;
  const player = state.currentPlayer;
  const opponent = player === 'white' ? 'black' : 'white';
  return {
    cubeValue: m.cube.value,
    cubeOwner: m.cube.owner === 'center' ? 0 : m.cube.owner === player ? 1 : 2,
    awayPlayer: m.length ? m.length - m.score[player] : 0,
    awayOpponent: m.length ? m.length - m.score[opponent] : 0,
    crawford: m.crawford,
    crawfordRule: m.crawfordRule !== false,
    jacoby: m.length === 0 && m.jacoby !== false,
    beavers: m.length === 0 && !!m.beavers,
    maxCube: m.cubeLimit ?? 32768,
  };
}
