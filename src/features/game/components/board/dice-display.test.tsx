import { render, screen } from '@testing-library/react-native';
import { DiceDisplay } from './dice-display';

it('shows unknown faces until each opening die rolls, then replaces them with values', () => {
  const { rerender } = render(<DiceDisplay dice={[0, 0]} remainingDice={[]} playerColor="white" slotColors={['white', 'black']} displayStyle="numbers" animateRoll={false} />);
  expect(screen.getAllByText('?')).toHaveLength(2);
  rerender(<DiceDisplay dice={[4, 0]} remainingDice={[4]} playerColor="white" slotColors={['white', 'black']} displayStyle="numbers" animateRoll={false} />);
  expect(screen.getAllByText('?')).toHaveLength(1);
  expect(screen.getByText('4')).toBeTruthy();
  rerender(<DiceDisplay dice={[4, 2]} remainingDice={[4, 2]} playerColor="white" slotColors={['white', 'black']} displayStyle="numbers" animateRoll={false} />);
  expect(screen.queryByText('?')).toBeNull();
  expect(screen.getByText('2')).toBeTruthy();
});
