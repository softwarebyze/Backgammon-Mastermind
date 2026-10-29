import type { Position, PositionLocation } from '@/lib/positions/position';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { newPosition, validatePosition } from '@/lib/positions/position';
import { setPositionStack } from '@/lib/positions/set-stack';
import { PositionCubePanel } from './position-cube';
import { PositionStackPanel } from './position-editor';
import { PositionScorePanel } from './position-scoreboard';
import { PositionStrip } from './position-strip';

jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key }));
jest.mock('@/lib/haptics', () => ({ hapticSelection: jest.fn() }));

/** The value a stepper announces ("label: value"). */
const value = (id: string) => (screen.getByTestId(id).props.accessibilityLabel as string).split(': ').pop();

describe('cube panel', () => {
  it('edits value and owner independently, then resets', () => {
    const p = newPosition();
    const change = jest.fn();
    const { rerender } = render(<PositionCubePanel position={p} onChange={change} onDone={jest.fn()} />);
    expect(screen.getByTestId('position-cube-value-lower')).toBeDisabled();
    fireEvent.press(screen.getByTestId('position-cube-value-higher'));
    const doubled: Position = change.mock.lastCall![0];
    expect(doubled.context).toEqual({ ...p.context, cubeExponent: 1 });
    rerender(<PositionCubePanel position={doubled} onChange={change} onDone={jest.fn()} />);
    expect(value('position-cube-value')).toBe('2');
    fireEvent.press(screen.getByTestId('position-cube-owner-black'));
    const owned: Position = change.mock.lastCall![0];
    expect(owned.context).toEqual({ ...doubled.context, cubeOwner: 'black' });
    rerender(<PositionCubePanel position={owned} onChange={change} onDone={jest.fn()} />);
    fireEvent.press(screen.getByTestId('position-cube-reset'));
    expect(change.mock.lastCall![0].context).toEqual({ ...p.context, cubeExponent: 0, cubeOwner: null });
  });

  it('respects imported cube limits and keeps Crawford context while lowering', () => {
    const p = newPosition();
    p.context = { ...p.context, cubeExponent: 3, maxCube: 3, matchLength: 5, crawford: true };
    const change = jest.fn();
    render(<PositionCubePanel position={p} onChange={change} onDone={jest.fn()} />);
    expect(screen.getByTestId('position-cube-value-higher')).toBeDisabled();
    fireEvent.press(screen.getByTestId('position-cube-value-lower'));
    expect(change.mock.lastCall![0].context).toEqual({ ...p.context, cubeExponent: 2 });
  });
});

describe('score panel', () => {
  it('steps each score without a keyboard and keeps it below the match target', () => {
    const p = newPosition();
    p.context = { ...p.context, matchLength: 7, scores: { white: 5, black: 6 }, cubeExponent: 2, cubeOwner: 'black' };
    const change = jest.fn();
    render(<PositionScorePanel position={p} onChange={change} onDone={jest.fn()} />);
    expect(value('position-score-white')).toBe('5');
    fireEvent.press(screen.getByTestId('position-score-white-higher'));
    expect(change.mock.lastCall![0].context).toEqual({ ...p.context, scores: { white: 6, black: 6 } });
    expect(screen.getByTestId('position-score-black-higher')).toBeDisabled();
  });

  it('shortening the match pulls scores down and clears match-only rules', () => {
    const p = newPosition();
    p.context = { ...p.context, matchLength: 3, scores: { white: 2, black: 2 }, crawford: true };
    const change = jest.fn();
    render(<PositionScorePanel position={p} onChange={change} onDone={jest.fn()} />);
    fireEvent.press(screen.getByTestId('position-match-length-lower'));
    const next: Position = change.mock.lastCall![0];
    expect(next.context).toMatchObject({ matchLength: 2, scores: { white: 1, black: 1 }, crawford: false });
    expect(() => validatePosition(next)).not.toThrow();
  });

  it('offers the money rules instead of scores in a money game', () => {
    const change = jest.fn();
    render(<PositionScorePanel position={newPosition()} onChange={change} onDone={jest.fn()} />);
    expect(value('position-match-length')).toBe('positions.money_short');
    // No score to keep in money play: the cards stay, dimmed and locked.
    expect(screen.getByTestId('position-score-white-higher')).toBeDisabled();
    fireEvent.press(screen.getByTestId('position-jacoby'));
    expect(change.mock.lastCall![0].context.jacoby).toBe(true);
  });
});

describe('stack panel', () => {
  it('uses the existing owner, then the selected colour after clearing', () => {
    let p = setPositionStack(newPosition(true), 6, 'black', 3);
    const change = jest.fn((next: Position) => {
      p = next;
    });
    const view = () => <PositionStackPanel position={p} location={6} color="white" onChange={change} onLocation={jest.fn()} onDone={jest.fn()} />;
    const { rerender } = render(view());
    fireEvent.press(screen.getByTestId('position-stack-count-higher'));
    expect(p.points[6]).toEqual({ player: 'black', count: 4 });
    rerender(view());
    fireEvent.press(screen.getByTestId('position-empty-point'));
    expect(p.points[6]).toEqual({ player: null, count: 0 });
    rerender(view());
    fireEvent.press(screen.getByTestId('position-stack-count-higher'));
    expect(p.points[6]).toEqual({ player: 'white', count: 1 });
  });

  it('cannot add past the checkers a side has left', () => {
    render(<PositionStackPanel position={newPosition()} location={6} color="white" onChange={jest.fn()} onLocation={jest.fn()} onDone={jest.fn()} />);
    expect(screen.getByTestId('position-stack-count-higher')).toBeDisabled();
    expect(screen.getByText('positions.no_checkers')).toBeTruthy();
  });
});

describe('strip', () => {
  const strip = (props: { position?: Position; location?: PositionLocation | null; focus?: 'cube' | 'dice' | 'score' | null; onChange?: jest.Mock; onFocus?: jest.Mock }) => (
    <PositionStrip
      position={props.position ?? newPosition()}
      location={props.location ?? null}
      focus={props.focus ?? null}
      color="white"
      onChange={props.onChange ?? jest.fn()}
      onLocation={jest.fn()}
      onFocus={props.onFocus ?? jest.fn()}
    />
  );

  it('summarises turn, dice and score when nothing is selected', () => {
    const onFocus = jest.fn();
    render(strip({ onFocus }));
    expect(screen.getByText('positions.strip_hint')).toBeTruthy();
    fireEvent.press(screen.getByTestId('position-dice-toggle'));
    expect(onFocus).toHaveBeenLastCalledWith('dice');
    fireEvent.press(screen.getByTestId('position-score-toggle'));
    expect(onFocus).toHaveBeenLastCalledWith('score');
  });

  it('switches the turn and clears action context that belonged to the other side', () => {
    const p = newPosition();
    p.context = { ...p.context, doubleAction: 'D', turnOwner: 'white', resignation: 2 };
    const onChange = jest.fn();
    render(strip({ position: p, onChange }));
    fireEvent.press(screen.getByTestId('position-turn'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ currentPlayer: 'black', context: expect.objectContaining({ doubleAction: '', resignation: 0, turnOwner: 'black' }) }));
  });

  it('sets both dice from the face rows and clears them with Roll later', () => {
    const onChange = jest.fn();
    const { rerender } = render(strip({ focus: 'dice', onChange }));
    fireEvent.press(screen.getByTestId('position-die-0-value-6'));
    const rolled: Position = onChange.mock.lastCall![0];
    expect(rolled.dice).toEqual([6, 6]);
    rerender(strip({ position: rolled, focus: 'dice', onChange }));
    fireEvent.press(screen.getByTestId('position-die-1-value-4'));
    expect(onChange.mock.lastCall![0].dice).toEqual([6, 4]);
    fireEvent.press(screen.getByTestId('position-clear-dice'));
    expect(onChange.mock.lastCall![0].dice).toEqual([0, 0]);
  });

  it('shows the selected point ahead of any other editor', () => {
    render(strip({ location: 13, focus: 'cube' }));
    expect(screen.getByTestId('position-point-controls')).toBeTruthy();
    expect(screen.queryByTestId('position-cube-panel')).toBeNull();
  });
});
