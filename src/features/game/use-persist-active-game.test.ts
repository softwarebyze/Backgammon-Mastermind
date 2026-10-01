import type { MoveLogEntry } from '@/lib/game/move-log';
import type { GameState } from '@/lib/game/types';
import { renderHook } from '@testing-library/react-native';
import { createInitialState } from '@/lib/game/constants';
import { savePersistedSession } from '@/lib/game/persistence';
import { usePersistActiveGame } from './use-persist-active-game';

jest.mock('@/lib/game/persistence', () => ({
  ...jest.requireActual('@/lib/game/persistence'),
  savePersistedSession: jest.fn(),
}));

it('persists in-progress and completed sessions when state or history changes', () => {
  const moveLog: MoveLogEntry[] = [];
  const initial = createInitialState('vs-human');
  const { rerender } = renderHook(
    ({
      state,
      log,
      replayBaseline,
    }: {
      state: GameState;
      log: MoveLogEntry[];
      replayBaseline: GameState | null;
    }) => usePersistActiveGame(state, log, replayBaseline),
    { initialProps: { state: initial, log: moveLog, replayBaseline: null as GameState | null } },
  );
  expect(savePersistedSession).toHaveBeenCalledTimes(1);
  rerender({ state: { ...initial, selectedPoint: 6 }, log: moveLog, replayBaseline: null });
  expect(savePersistedSession).toHaveBeenCalledTimes(2);
  const nextLog: MoveLogEntry[] = [...moveLog];
  rerender({ state: initial, log: nextLog, replayBaseline: initial });
  expect(savePersistedSession).toHaveBeenCalledTimes(3);
  const completed = { ...initial, phase: 'game-over' as const, winner: 'white' as const };
  rerender({ state: completed, log: nextLog, replayBaseline: initial });
  expect(savePersistedSession).toHaveBeenCalledTimes(4);
  expect(savePersistedSession).toHaveBeenLastCalledWith({
    state: completed,
    moveLog: nextLog,
    replayBaseline: initial,
  });
});
