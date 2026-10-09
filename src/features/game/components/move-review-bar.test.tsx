import Feather from '@expo/vector-icons/Feather';

import { useLayoutIsRTL } from '@/lib/i18n';
import { cleanup, fireEvent, render, screen, within } from '@/lib/test-utils';

import { MoveReviewBar } from './move-review-bar';

jest.mock('@/lib/i18n', () => ({
  ...jest.requireActual('@/lib/i18n'),
  useLayoutIsRTL: jest.fn(() => false),
}));
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));

const layoutRTL = jest.mocked(useLayoutIsRTL);
beforeEach(() => layoutRTL.mockReturnValue(false));
afterEach(cleanup);

function renderBar() {
  const onStepBack = jest.fn();
  const onStepForward = jest.fn();
  render(
    <MoveReviewBar
      viewIndex={1}
      liveIndex={2}
      isReviewing
      moveLog={[]}
      focusedPly={1}
      positionLabel={null}
      canStepBack
      canStepForward
      onStepBack={onStepBack}
      onStepForward={onStepForward}
      onJumpToPly={jest.fn()}
      onGoLive={jest.fn()}
    />,
  );
  return { onStepBack, onStepForward };
}

it.each([false, true])('points timeline back and forward the reading direction with RTL=%s', (rtl) => {
  layoutRTL.mockReturnValue(rtl);
  const { onStepBack, onStepForward } = renderBar();
  const back = screen.getByRole('button', { name: 'Previous turn' });
  const forward = screen.getByRole('button', { name: 'Next turn' });
  expect(within(back).UNSAFE_getByType(Feather).props.name).toBe(rtl ? 'chevron-right' : 'chevron-left');
  expect(within(forward).UNSAFE_getByType(Feather).props.name).toBe(rtl ? 'chevron-left' : 'chevron-right');
  fireEvent.press(back);
  expect(onStepBack).toHaveBeenCalledTimes(1);
  fireEvent.press(forward);
  expect(onStepForward).toHaveBeenCalledTimes(1);
});
