import { getCubeHint } from '@/features/game/cube-analysis';
import { createPositionState } from '@/lib/game/create-position';
import { createMatch } from '@/lib/game/match';
import { act, fireEvent, render, screen, waitFor } from '@/lib/test-utils';
import { CubeHintButton } from './cube-hint-button';

jest.mock('@/features/game/cube-analysis', () => ({ getCubeHint: jest.fn() }));
const ask = jest.mocked(getCubeHint);
beforeEach(() => ask.mockReset());
function state() {
  return createPositionState({ useStandardSetup: true, match: createMatch(0) });
}

it.each([['double', 'Double'], ['no_double', 'No double'], ['accept', 'Take'], ['drop', 'Pass']] as const)('reveals %s and dismisses without playing it', async (result, label) => {
  const position = state();
  ask.mockResolvedValue(result);
  render(<CubeHintButton state={position} disabled={false} />);
  fireEvent.press(screen.getByTestId('cube-hint-button'));
  await screen.findByTestId('cube-hint-result');
  expect(screen.getByTestId('cube-hint-result')).toHaveTextContent(label);
  expect(position.match?.cube.value).toBe(1);
  fireEvent.press(screen.getByTestId('cube-hint-dismiss'));
  expect(screen.queryByTestId('cube-hint-result')).toBeNull();
});

it('offers retry when the engine fails', async () => {
  ask.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce('double');
  render(<CubeHintButton state={state()} disabled={false} />);
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
  const view = render(<CubeHintButton state={position} disabled={false} />);
  fireEvent.press(screen.getByTestId('cube-hint-button'));
  view.rerender(<CubeHintButton state={{ ...position, currentPlayer: 'black' }} disabled={false} />);
  await act(async () => resolve('double'));
  expect(screen.queryByTestId('cube-hint-result')).toBeNull();
});

it('blocks hints during animation or redo', () => {
  render(<CubeHintButton state={state()} disabled />);
  fireEvent.press(screen.getByTestId('cube-hint-button'));
  expect(ask).not.toHaveBeenCalled();
});

it('lets the player ask again after a blocked request is cancelled', async () => {
  let resolve!: (value: 'double') => void;
  ask.mockImplementationOnce(() => new Promise((done) => {
    resolve = done;
  })).mockResolvedValueOnce('no_double');
  const position = state();
  const view = render(<CubeHintButton state={position} disabled={false} />);
  fireEvent.press(screen.getByTestId('cube-hint-button'));
  view.rerender(<CubeHintButton state={position} disabled />);
  view.rerender(<CubeHintButton state={position} disabled={false} />);
  await act(async () => resolve('double'));
  expect(screen.queryByTestId('cube-hint-result')).toBeNull();
  fireEvent.press(screen.getByTestId('cube-hint-button'));
  expect(await screen.findByTestId('cube-hint-result')).toHaveTextContent('No double');
});
