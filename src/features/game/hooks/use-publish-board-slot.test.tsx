import type { PropsWithChildren } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { act, cleanup, renderHook } from '@/lib/test-utils';
import { clearBoardSlotSize, useBoardSlotSize } from './board-slot-size';
import { resolveBoardViewport } from './use-board-dimensions';
import { usePublishBoardSlot } from './use-publish-board-slot';

const mockWindow = { width: 390, height: 664, scale: 2, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- real hook export
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function wrapper({ children }: PropsWithChildren) {
  return <HeaderHeightContext value={64}>{children}</HeaderHeightContext>;
}
function measurement(width: number, height: number) {
  return { nativeEvent: { layout: { x: 0, y: 0, width, height } } } as LayoutChangeEvent;
}
afterEach(() => {
  cleanup();
  clearBoardSlotSize();
  mockWindow.height = 664;
});

it('keeps full phone width with fixed match chrome and follows viewport height changes', () => {
  const view = renderHook(() => ({ measure: usePublishBoardSlot(), slot: useBoardSlotSize() }), { wrapper });
  act(() => {
    view.result.current.measure.onTopLayout(measurement(390, 98));
    view.result.current.measure.onControlsLayout(measurement(390, 144));
    view.result.current.measure.onSlotLayout(measurement(390, 290));
  });
  expect(view.result.current.slot).toEqual({ width: 390, height: 290 });
  const dimensions = () => resolveBoardViewport({
    screenWidth: mockWindow.width,
    screenHeight: mockWindow.height,
    platform: 'web',
    slotWidth: view.result.current.slot.width,
    slotHeight: view.result.current.slot.height,
  });
  expect(dimensions().boardOuterWidth).toBe(390);
  // Opening, roll, selected checker, confirm, offer, result and next opening
  // all publish the same allocated chrome; none may progressively shrink it.
  for (let phase = 0; phase < 7; phase++) {
    act(() => {
      view.result.current.measure.onControlsLayout(measurement(390, 144));
      view.result.current.measure.onTopLayout(measurement(390, 98));
    });
    expect(view.result.current.slot.height).toBe(290);
    expect(dimensions().boardOuterWidth).toBe(390);
  }
  mockWindow.height = 744;
  view.rerender({});
  act(() => view.result.current.measure.onSlotLayout(measurement(390, 370)));
  expect(view.result.current.slot).toEqual({ width: 390, height: 370 });
  expect(dimensions().boardOuterWidth).toBe(390);
  mockWindow.height = 664;
  view.rerender({});
  act(() => view.result.current.measure.onSlotLayout(measurement(390, 290)));
  expect(view.result.current.slot.height).toBe(290);
  expect(dimensions().boardOuterWidth).toBe(390);
});
