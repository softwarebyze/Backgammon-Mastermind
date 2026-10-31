import type { Position } from '@/lib/positions/position';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { newPosition } from '@/lib/positions/position';
import { BoardCube } from './position-cube';

jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key }));
jest.mock('@/lib/haptics', () => ({ hapticSelection: jest.fn() }));

const dims = fitBoardToViewport(398, 470, { extraHeight: 36 });

function mountCube(context: Partial<Position['context']> = {}) {
  const p = newPosition();
  p.context = { ...p.context, ...context };
  const onChange = jest.fn();
  render(<BoardCube position={p} dimensions={dims} onChange={onChange} />);
  return onChange;
}

it('opens every value and owner in one tap', () => {
  const onChange = mountCube();
  expect(screen.queryByTestId('position-cube-picker')).toBeNull();
  fireEvent(screen.getByTestId('position-cube'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  fireEvent.press(screen.getByTestId('position-cube-value-3'));
  expect(onChange).toHaveBeenLastCalledWith({ cubeExponent: 3 });
  fireEvent.press(screen.getByTestId('position-cube-owner-black'));
  expect(onChange).toHaveBeenLastCalledWith({ cubeOwner: 'black' });
  // The picker stays open for the other half; Done closes it.
  fireEvent.press(screen.getByTestId('position-cube-done'));
  expect(screen.queryByTestId('position-cube-picker')).toBeNull();
});

it('offers values up to 64, or the match cube limit when lower', () => {
  mountCube({ maxCube: 10 });
  fireEvent(screen.getByTestId('position-cube'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  expect(screen.getByTestId('position-cube-value-6')).toBeTruthy();
  expect(screen.queryByTestId('position-cube-value-7')).toBeNull();
  screen.unmount();
  mountCube({ maxCube: 3 });
  fireEvent(screen.getByTestId('position-cube'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  expect(screen.getByTestId('position-cube-value-3')).toBeTruthy();
  expect(screen.queryByTestId('position-cube-value-4')).toBeNull();
  fireEvent.press(screen.getByTestId('position-cube-picker-close'));
  expect(screen.queryByTestId('position-cube-picker')).toBeNull();
});

it('adjusts the value and owner from accessibility actions', () => {
  const onChange = mountCube({ cubeExponent: 1 });
  const cube = screen.getByTestId('position-cube');
  fireEvent(cube, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(onChange).toHaveBeenLastCalledWith({ cubeExponent: 2 });
  fireEvent(cube, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(onChange).toHaveBeenLastCalledWith({ cubeExponent: 0 });
  fireEvent(cube, 'accessibilityAction', { nativeEvent: { actionName: 'down' } });
  expect(onChange).toHaveBeenLastCalledWith({ cubeOwner: 'white' });
});
