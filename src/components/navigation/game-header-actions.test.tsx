import { Feather } from '@expo/vector-icons';
import { fireEvent, render, screen, within } from '@/lib/test-utils';
import { GameHeaderActions } from './game-header-actions';

it('uses the Settings gear and opens Settings through its accessible button', () => {
  const onOptions = jest.fn();
  render(<GameHeaderActions onOptions={onOptions} onReset={jest.fn()} />);
  const settings = screen.getByRole('button', { name: 'Settings' });
  expect(within(settings).UNSAFE_getByType(Feather).props.name).toBe('settings');
  fireEvent.press(settings);
  expect(onOptions).toHaveBeenCalledTimes(1);
});
