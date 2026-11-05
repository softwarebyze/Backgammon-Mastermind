import type { ReactNode } from 'react';
import { createMatchGame } from '@/lib/game/match';
import { cleanup, setup } from '@/lib/test-utils';
import { MatchControls } from './match-controls';

const mockFocus = jest.fn();
jest.mock('@/components/ui/hover-pressable', () => {
  const { View } = require('react-native');
  return {
    HoverPressable: ({ ref, testID, children }: { ref?: { current: unknown }; testID?: string; children?: ReactNode }) => {
      if (ref)
        ref.current = { focus: mockFocus };
      return <View testID={testID}>{children}</View>;
    },
  };
});
jest.mock('@/features/game/use-game', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock preserves public hook name
  useGame: () => ({ matchAction: jest.fn(), isAnimating: false, canRedo: false, canBranchCubeHistory: false }),
}));
afterEach(cleanup);

it('puts keyboard focus on Next game when a game of the match ends', () => {
  const state = createMatchGame(3, 'vs-computer');
  state.phase = 'game-over';
  state.match!.result = { winner: 'white', points: 1, kind: 'single' };
  state.match!.score.white = 1;
  setup(<MatchControls state={state} onRoll={jest.fn()} onReset={jest.fn()} isHumanTurn isComputerTurn={false} />);
  expect(mockFocus).toHaveBeenCalledTimes(1);
});
