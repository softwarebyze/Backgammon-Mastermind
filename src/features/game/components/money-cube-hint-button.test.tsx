import { getMoneyCubeHint } from '@/features/game/money-cube-hint';
import { createPositionState } from '@/lib/game/create-position';
import { createMatch } from '@/lib/game/match';
import { act, fireEvent, render, screen, waitFor } from '@/lib/test-utils';
import { MoneyCubeHintButton } from './money-cube-hint-button';

jest.mock('@/features/game/money-cube-hint', () => ({ getMoneyCubeHint: jest.fn() }));
const ask = jest.mocked(getMoneyCubeHint);
beforeEach(() => ask.mockReset());
function state() {
  return createPositionState({ useStandardSetup: true, match: createMatch(0) });
}

it.each([['double', 'Double'], ['no_double', 'No double'], ['accept', 'Take'], ['drop', 'Pass']] as const)('reveals %s and dismisses without playing it', async (result, label) => {
  const position = state();
  ask.mockResolvedValue(result);
  render(<MoneyCubeHintButton state={position} disabled={false} />);
  fireEvent.press(screen.getByTestId('cube-hint-button'));
  await screen.findByTestId('cube-hint-result');
  expect(screen.getByTestId('cube-hint-result')).toHaveTextContent(label);
  expect(position.match?.cube.value).toBe(1);
  fireEvent.press(screen.getByTestId('cube-hint-dismiss'));
  expect(screen.queryByTestId('cube-hint-result')).toBeNull();
});

it('offers retry when the engine fails', async () => {
  ask.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce('double');
  render(<MoneyCubeHintButton state={state()} disabled={false} />);
  fireEvent.press(screen.getByTestId('cube-hint-button'));
  await screen.findByTestId('cube-hint-result');
  expect(await screen.findByTestId('cube-hint-retry')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('cube-hint-retry'));
  await waitFor(() => expect(screen.getByTestId('cube-hint-result')).toHaveTextContent('Double'));
  expect(screen.getByTestId('cube-hint-result')).toHaveTextContent('Double');
});

it('drops an answer after the cube or board changes', async () => {
  let resolve!: (value: 'double') => void;
  ask.mockImplementation(() => new Promise((done) => {
    resolve = done;
  }));
  const position = state();
  const view = render(<MoneyCubeHintButton state={position} disabled={false} />);
  fireEvent.press(screen.getByTestId('cube-hint-button'));
  view.rerender(<MoneyCubeHintButton state={{ ...position, currentPlayer: 'black' }} disabled={false} />);
  await act(async () => resolve('double'));
  expect(screen.queryByTestId('cube-hint-result')).toBeNull();
});

it('blocks hints during animation or redo', () => {
  render(<MoneyCubeHintButton state={state()} disabled />);
  fireEvent.press(screen.getByTestId('cube-hint-button'));
  expect(ask).not.toHaveBeenCalled();
});

it('lets the player ask again after a blocked request is cancelled', async () => {
  let resolve!: (value: 'double') => void;
  ask.mockImplementationOnce(() => new Promise((done) => {
    resolve = done;
  })).mockResolvedValueOnce('no_double');
  const position = state();
  const view = render(<MoneyCubeHintButton state={position} disabled={false} />);
  fireEvent.press(screen.getByTestId('cube-hint-button'));
  view.rerender(<MoneyCubeHintButton state={position} disabled />);
  view.rerender(<MoneyCubeHintButton state={position} disabled={false} />);
  await act(async () => resolve('double'));
  expect(screen.queryByTestId('cube-hint-result')).toBeNull();
  fireEvent.press(screen.getByTestId('cube-hint-button'));
  expect(await screen.findByTestId('cube-hint-result')).toHaveTextContent('No double');
});
