import { fireEvent, render, screen } from '@testing-library/react-native';
import { newPosition } from '@/lib/positions/position';
import { PositionCube } from './position-cube';

it('shows the centered cube without opening match details, then edits value and owner independently', () => {
  const p = newPosition();
  p.context.scores = { white: 2, black: 3 };
  const change = jest.fn();
  const { rerender } = render(<PositionCube position={p} onChange={change} />);
  expect(screen.getByText('64')).toBeTruthy();
  expect(screen.getByTestId('position-cube').props.accessibilityLabel).toContain('Cube owner: Center');
  fireEvent.press(screen.getByTestId('position-cube'));
  expect(screen.getByTestId('position-cube-lower').props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByTestId('position-cube-higher'));
  const doubled = change.mock.lastCall![0];
  expect(doubled.context).toEqual({ ...p.context, cubeExponent: 1 });
  rerender(<PositionCube position={doubled} onChange={change} />);
  expect(screen.getByText('2')).toBeTruthy();
  fireEvent.press(screen.getByTestId('position-cube-owner-black'));
  const owned = change.mock.lastCall![0];
  expect(owned.context).toEqual({ ...doubled.context, cubeOwner: 'black' });
  rerender(<PositionCube position={owned} onChange={change} />);
  fireEvent.press(screen.getByTestId('position-cube-reset'));
  expect(change.mock.lastCall![0].context).toEqual({ ...p.context, cubeExponent: 0, cubeOwner: null });
});

it('respects imported cube limits and preserves Crawford context while lowering', () => {
  const p = newPosition();
  p.context = { ...p.context, cubeExponent: 3, maxCube: 3, matchLength: 5, crawford: true };
  const change = jest.fn();
  render(<PositionCube position={p} onChange={change} />);
  expect(screen.getByTestId('position-cube').props.accessibilityLabel).toContain('Crawford');
  fireEvent.press(screen.getByTestId('position-cube'));
  expect(screen.getByTestId('position-cube-higher').props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByTestId('position-cube-lower'));
  expect(change.mock.lastCall![0].context).toEqual({ ...p.context, cubeExponent: 2 });
});
