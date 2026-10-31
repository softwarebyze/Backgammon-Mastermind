import { fireEvent, render, screen } from '@/lib/test-utils';
import { HomeTitle } from './home-title';
import { homeTitleScale } from './home-title-scale';

it('keeps full size when the widest word fits', () => {
  expect(homeTitleScale(400, 32)).toBe(1);
  expect(homeTitleScale(300, 22)).toBe(1);
});

it('shrinks on a narrow phone instead of breaking a word', () => {
  // A 360 pt Android phone has 312 pt between the side paddings.
  expect(homeTitleScale(312, 32)).toBeCloseTo(312 / 330);
  expect(homeTitleScale(100, 32)).toBe(0.6);
});

it('sizes the title from the space it is laid out in', () => {
  render(<HomeTitle landscape={false} />);
  fireEvent(screen.getByTestId('home-title'), 'layout', { nativeEvent: { layout: { width: 247.5, height: 80 } } });
  expect(screen.getByRole('header')).toHaveStyle({ fontSize: 24, letterSpacing: 3 });
});
