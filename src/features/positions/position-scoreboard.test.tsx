import { fireEvent, render, screen } from '@testing-library/react-native';
import { newPosition, validatePosition } from '@/lib/positions/position';
import { PositionScoreboard } from './position-scoreboard';

it('edits each visible score while retaining the opponent and cube context', () => {
  const p = newPosition();
  p.context = { ...p.context, matchLength: 7, scores: { white: 2, black: 4 }, cubeExponent: 2, cubeOwner: 'black' };
  const change = jest.fn();
  render(<PositionScoreboard position={p} onChange={change} />);
  expect(screen.getByTestId('position-score-white').props.value).toBe('2');
  expect(screen.getByTestId('position-score-black').props.value).toBe('4');
  fireEvent.changeText(screen.getByTestId('position-score-white'), '3');
  expect(change.mock.lastCall![0].context).toEqual({ ...p.context, scores: { white: 3, black: 4 } });
  fireEvent.changeText(screen.getByTestId('position-score-black'), '6');
  expect(change.mock.lastCall![0].context).toEqual({ ...p.context, scores: { white: 2, black: 6 } });
  fireEvent.changeText(screen.getByTestId('position-score-black'), '-1');
  expect(change).toHaveBeenCalledTimes(2);
});

it('keeps scores within the match target when editing a score or shortening the match', () => {
  const p = newPosition();
  p.context = { ...p.context, matchLength: 7, scores: { white: 6, black: 5 }, crawford: true };
  const change = jest.fn();
  render(<PositionScoreboard position={p} onChange={change} />);
  fireEvent.changeText(screen.getByTestId('position-score-white'), '9');
  expect(change.mock.lastCall![0].context.scores.white).toBe(7);
  fireEvent.changeText(screen.getByTestId('position-match-length'), '3');
  const next = change.mock.lastCall![0];
  expect(next.context).toMatchObject({ matchLength: 3, scores: { white: 3, black: 3 }, crawford: false, jacoby: false, beavers: false });
  expect(() => validatePosition(next)).not.toThrow();
});

it('supports money scores and clears scores with an empty numeric field', () => {
  const p = newPosition();
  const change = jest.fn();
  render(<PositionScoreboard position={p} onChange={change} />);
  expect(screen.getByText('Money game')).toBeTruthy();
  fireEvent.changeText(screen.getByTestId('position-score-black'), '99999');
  expect(change.mock.lastCall![0].context.scores.black).toBe(32767);
  fireEvent.changeText(screen.getByTestId('position-score-white'), '');
  expect(change.mock.lastCall![0].context.scores.white).toBe(0);
});
