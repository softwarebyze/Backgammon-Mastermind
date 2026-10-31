import { fireEvent, render, screen } from '@testing-library/react-native';
import { PositionStepper } from './position-stepper';

jest.mock('@/lib/haptics', () => ({ hapticSelection: jest.fn() }));

it('puts ▲ above and ▼ below the value and stays within its range', () => {
  const change = jest.fn();
  const { rerender } = render(<PositionStepper label="Score" testID="s" value={0} min={0} max={2} onChange={change} />);
  expect(screen.getByTestId('s').props.accessibilityLabel).toBe('Score: 0');
  expect(screen.getByTestId('s-lower')).toBeDisabled();
  fireEvent.press(screen.getByTestId('s-higher'));
  expect(change).toHaveBeenLastCalledWith(1);
  rerender(<PositionStepper label="Score" testID="s" value={2} min={0} max={2} onChange={change} />);
  expect(screen.getByTestId('s-higher')).toBeDisabled();
});
