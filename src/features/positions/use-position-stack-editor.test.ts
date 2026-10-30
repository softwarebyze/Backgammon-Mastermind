import type { Position } from '@/lib/positions/position';
import { act, renderHook } from '@testing-library/react-native';
import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { newPosition } from '@/lib/positions/position';
import { usePositionStackEditor } from './use-position-stack-editor';

jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));

const dims = fitBoardToViewport(398, 470, { extraHeight: 36 });

function tallStack(): Position {
  // White: 12 on the 6-point, 3 on the 8-point.
  const p = newPosition(true);
  p.points[6] = { player: 'white', count: 12 };
  p.points[8] = { player: 'white', count: 3 };
  p.borneOff.white = 0;
  return p;
}

it('never cuts a stack taller than the point can draw on a plain press', () => {
  const onChange = jest.fn();
  const { result } = renderHook(() => usePositionStackEditor({ position: tallStack(), color: 'white', location: null, dimensions: dims, onLocation: jest.fn(), onChange, onBlocked: jest.fn() }));
  // A press near the base of the 6-point (a bottom point) derives a small count.
  act(() => result.current.onStart(6, dims.pointHeight - dims.checkerSize));
  act(() => result.current.onEnd(6, true));
  // The tap changes nothing: the 12-checker stack stays whole.
  expect(onChange).not.toHaveBeenCalled();
});

it('still sizes an ordinary stack to the press', () => {
  const onChange = jest.fn();
  const { result } = renderHook(() => usePositionStackEditor({ position: tallStack(), color: 'white', location: null, dimensions: dims, onLocation: jest.fn(), onChange, onBlocked: jest.fn() }));
  act(() => result.current.onStart(8, dims.pointHeight - dims.checkerSize / 2));
  expect(onChange.mock.lastCall![0].points[8]).toEqual({ player: 'white', count: 1 });
});

it('sizes a tall stack from the press once the finger moves', () => {
  const onChange = jest.fn();
  const { result } = renderHook(() => usePositionStackEditor({ position: tallStack(), color: 'white', location: null, dimensions: dims, onLocation: jest.fn(), onChange, onBlocked: jest.fn() }));
  act(() => result.current.onStart(6, dims.pointHeight - dims.checkerSize));
  act(() => result.current.onDelta(6, 0));
  const pressed = onChange.mock.lastCall![0].points[6].count;
  expect(pressed).toBeLessThan(12);
  // Dragging on from the press removes more, down to an empty point.
  act(() => result.current.onEnd(6, false, 15));
  expect(onChange.mock.lastCall![0].points[6].count).toBe(0);
});
