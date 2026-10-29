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

it('steps toward Black or White with the arrows and hides the arrow at each end', () => {
  let onChange = mountCube();
  fireEvent.press(screen.getByTestId('position-cube-down'));
  expect(onChange).toHaveBeenLastCalledWith({ cubeOwner: 'white' });
  screen.unmount();
  onChange = mountCube({ cubeOwner: 'black' });
  expect(screen.queryByTestId('position-cube-up')).toBeNull();
  fireEvent.press(screen.getByTestId('position-cube-down'));
  expect(onChange).toHaveBeenLastCalledWith({ cubeOwner: null });
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
