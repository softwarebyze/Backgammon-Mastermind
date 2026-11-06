import { render, screen } from '@testing-library/react-native';
import { DiceDisplay } from './dice-display';

/** Walk up from the numeral to the die face View that carries used opacity. */
function dieOpacity(node: { parent?: unknown } | null | undefined): number | undefined {
  let cur: { parent?: unknown; props?: { style?: unknown } } | null | undefined = node as any;
  for (let i = 0; i < 5 && cur; i += 1) {
    const style = cur.props?.style;
    const flat = Array.isArray(style) ? style : style != null ? [style] : [];
    for (const entry of flat) {
      if (entry && typeof entry === 'object' && 'opacity' in entry) {
        return (entry as { opacity: number }).opacity;
      }
    }
    cur = cur.parent as typeof cur;
  }
  return undefined;
}

it.each([false, true])('places the logical leading die at the physical reading edge (RTL=%s)', (rtl) => {
  render(<DiceDisplay dice={[1, 3]} remainingDice={[3]} playerColor="white" leadingRTL={rtl} displayStyle="numbers" />);
  expect(screen.getByTestId('dice-display')).toHaveStyle({ flexDirection: rtl ? 'row-reverse' : 'row' });
  // Slot zero is spent; slot one remains available regardless of physical direction.
  expect(dieOpacity(screen.getByText('1'))).toBe(0.4);
  expect(dieOpacity(screen.getByText('3'))).toBe(1);
});

it.each([false, true])('marks the leading double spent first (RTL=%s)', (rtl) => {
  render(<DiceDisplay dice={[2, 2]} remainingDice={[2, 2, 2]} playerColor="white" leadingRTL={rtl} displayStyle="numbers" />);
  const slots = screen.getAllByText('2');
  expect(dieOpacity(slots[0]!)).toBe(0.4);
  expect(dieOpacity(slots[1]!)).toBe(1);
});
