import { render, screen } from '@testing-library/react-native';
import { DiceDisplay } from './dice-display';

it.each([false, true])('places the logical leading die at the physical reading edge (RTL=%s)', (rtl) => {
  render(<DiceDisplay dice={[1, 3]} remainingDice={[3]} playerColor="white" leadingRTL={rtl} displayStyle="numbers" />);
  expect(screen.getByTestId('dice-display')).toHaveStyle({ direction: 'ltr', flexDirection: rtl ? 'row-reverse' : 'row' });
  // Slot zero is spent; slot one remains available regardless of physical direction.
  expect(screen.getByText('1').parent?.parent?.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ opacity: 0.4 })]));
  expect(screen.getByText('3').parent?.parent?.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ opacity: 1 })]));
});

it.each([false, true])('marks the leading double spent first (RTL=%s)', (rtl) => {
  render(<DiceDisplay dice={[2, 2]} remainingDice={[2, 2, 2]} playerColor="white" leadingRTL={rtl} displayStyle="numbers" />);
  const slots = screen.getAllByText('2');
  expect(slots[0]!.parent?.parent?.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ opacity: 0.4 })]));
  expect(slots[1]!.parent?.parent?.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ opacity: 1 })]));
});
