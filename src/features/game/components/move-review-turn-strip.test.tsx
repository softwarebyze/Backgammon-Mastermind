import type { MoveLogEntry } from '@/lib/game/move-log';
import { Platform, ScrollView } from 'react-native';

import { useLayoutIsRTL } from '@/lib/i18n';
import { cleanup, fireEvent, render, screen, waitFor } from '@/lib/test-utils';

import { MoveReviewTurnStrip } from './move-review-turn-strip';

jest.mock('react-native', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const scrollTo = jest.fn();
  function MockScrollView({ ref, ...props }: { ref?: unknown }) {
    React.useImperativeHandle(ref as never, () => ({ scrollTo }));
    return React.createElement(RN.ScrollView, props);
  }
  return new Proxy(RN, {
    get(target, prop) {
      if (prop === 'ScrollView')
        return MockScrollView;
      if (prop === '__scrollTo')
        return scrollTo;
      return Reflect.get(target, prop);
    },
  });
});
jest.mock('@/lib/i18n', () => ({
  ...jest.requireActual('@/lib/i18n'),
  useLayoutIsRTL: jest.fn(() => false),
}));
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));

const layoutRTL = jest.mocked(useLayoutIsRTL);
const originalOS = Platform.OS;

const moveLog: MoveLogEntry[] = [
  { ply: 1, player: 'white', dice: [3, 1], from: 8, to: 5 },
  { ply: 2, player: 'black', dice: [2, 4], from: 8, to: 5 },
  { ply: 3, player: 'white', dice: [5, 6], from: 8, to: 5 },
  { ply: 4, player: 'black', dice: [1, 2], from: 8, to: 5 },
  { ply: 5, player: 'white', dice: [3, 4], from: 8, to: 5 },
  { ply: 6, player: 'black', dice: [5, 1], from: 8, to: 5 },
  { ply: 7, player: 'white', dice: [2, 6], from: 8, to: 5 },
  { ply: 8, player: 'black', dice: [4, 3], from: 8, to: 5 },
];

const scrollTo = (jest.requireMock('react-native') as { __scrollTo: jest.Mock }).__scrollTo;

function renderStrip(isReviewing: boolean) {
  render(
    <MoveReviewTurnStrip
      viewIndex={moveLog.length}
      isReviewing={isReviewing}
      moveLog={moveLog}
      focusedPly={moveLog.length}
      onJumpToPly={jest.fn()}
      onGoLive={jest.fn()}
    />,
  );
}

function layoutStrip() {
  const scroll = screen.UNSAFE_getByType(ScrollView);
  fireEvent(scroll, 'contentSizeChange', 734, 40);
  fireEvent(scroll, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 294, height: 40 } },
  });
}

beforeEach(() => {
  layoutRTL.mockReturnValue(false);
  Platform.OS = originalOS;
  scrollTo.mockClear();
});
afterEach(() => {
  Platform.OS = originalOS;
  cleanup();
});

it.each([
  ['android', 0],
  ['ios', 440],
  ['web', -440],
])('scrolls Live into view with the %s RTL offset', async (os, expectedX) => {
  Platform.OS = os as typeof Platform.OS;
  layoutRTL.mockReturnValue(true);
  renderStrip(false);
  layoutStrip();

  await waitFor(() => {
    expect(scrollTo).toHaveBeenLastCalledWith({ x: expectedX, animated: true });
  });
});
