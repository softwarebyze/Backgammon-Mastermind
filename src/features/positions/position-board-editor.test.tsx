import type { StackEditHandlers } from '@/features/game/components/board/use-stack-edit-gesture';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { hapticLight } from '@/lib/haptics';
import { newPosition } from '@/lib/positions/position';
import { setPositionStack } from '@/lib/positions/set-stack';
import { PositionBoardEditor } from './position-board-editor';

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});

let mockEditor: StackEditHandlers;
jest.mock('@/features/game/components/board/board-view', () => ({ BoardView: ({ stackEditor }: { stackEditor: StackEditHandlers }) => {
  mockEditor = stackEditor;
  return null;
} }));
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));
jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key }));

const dims = fitBoardToViewport(380, 310);
const spacing = Math.min(dims.checkerSize - 2, (dims.pointHeight - dims.checkerSize) / 4);
function yForCount(count: number, top = false) {
  const distance = dims.checkerSize / 2 + (count - 1) * spacing;
  return top ? distance : dims.pointHeight - distance;
}
beforeEach(() => jest.clearAllMocks());

it('keeps a drag anchored to its starting snapshot and restores it on cancellation', () => {
  const p = setPositionStack(newPosition(true), 6, 'white', 5);
  const change = jest.fn();
  render(<PositionBoardEditor position={p} dimensions={dims} location={null} onLocation={jest.fn()} onChange={change} />);
  act(() => mockEditor.onStart(6, yForCount(5)));
  act(() => mockEditor.onDelta(6, -2));
  expect(change.mock.lastCall![0].points[6].count).toBe(7);
  act(() => mockEditor.onDelta(6, 2));
  expect(change.mock.lastCall![0].points[6].count).toBe(3);
  act(() => mockEditor.onCancel());
  expect(change.mock.lastCall![0]).toBe(p);
});

it('uses the chosen color for taps, drags and accessible increments', () => {
  const p = newPosition(true);
  const change = jest.fn();
  render(<PositionBoardEditor position={p} dimensions={dims} location={null} onLocation={jest.fn()} onChange={change} />);
  fireEvent.press(screen.getByTestId('position-paint-black'));
  act(() => mockEditor.onStart(13, yForCount(1, true)));
  act(() => mockEditor.onDelta(13, 3));
  expect(change.mock.lastCall![0].points[13]).toEqual({ player: 'black', count: 4 });
  act(() => mockEditor.onEnd(13, false));
  expect(change).toHaveBeenCalledTimes(2);
  act(() => mockEditor.onStart(6, yForCount(1)));
  act(() => mockEditor.onEnd(6, true));
  expect(change.mock.lastCall![0].points[6]).toEqual({ player: 'black', count: 1 });
  act(() => mockEditor.onAdjust(0, 1));
  expect(change.mock.lastCall![0].bar.black).toBe(1);
});

it('uses the touched checker slot immediately and does not add another checker on release', () => {
  const change = jest.fn();
  render(<PositionBoardEditor position={newPosition(true)} dimensions={dims} location={null} onLocation={jest.fn()} onChange={change} />);
  act(() => mockEditor.onStart(6, yForCount(3)));
  expect(change.mock.lastCall![0].points[6].count).toBe(3);
  act(() => mockEditor.onEnd(6, true, 0));
  expect(change).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByTestId('position-paint-black'));
  act(() => mockEditor.onStart(13, yForCount(4, true)));
  expect(change.mock.lastCall![0].points[13]).toEqual({ player: 'black', count: 4 });
  act(() => mockEditor.onDelta(13, 2));
  expect(change.mock.lastCall![0].points[13].count).toBe(6);
});

it('gives one light haptic and accessible feedback per blocked gesture, including its release', () => {
  const p = newPosition();
  const change = jest.fn();
  render(<PositionBoardEditor position={p} dimensions={dims} location={null} onLocation={jest.fn()} onChange={change} />);
  act(() => mockEditor.onStart(3, yForCount(3)));
  act(() => mockEditor.onDelta(3, -1));
  act(() => mockEditor.onDelta(3, -2));
  act(() => mockEditor.onEnd(3, false, -2));
  expect(hapticLight).toHaveBeenCalledTimes(1);
  expect(change.mock.lastCall![0]).toEqual(p);
  expect(announce).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('position-no-checkers')).toBeNull();
  act(() => mockEditor.onStart(3, yForCount(1)));
  act(() => mockEditor.onEnd(3, true, 0));
  expect(hapticLight).toHaveBeenCalledTimes(2);
  fireEvent.press(screen.getByTestId('position-paint-black'));
  expect(screen.queryByTestId('position-no-checkers')).toBeNull();
});

it('only signals exhaustion when an addition is blocked, not when reducing or matching an own stack', () => {
  const p = newPosition();
  const change = jest.fn();
  render(<PositionBoardEditor position={p} dimensions={dims} location={null} onLocation={jest.fn()} onChange={change} />);
  act(() => mockEditor.onStart(6, yForCount(5)));
  expect(hapticLight).not.toHaveBeenCalled();
  act(() => mockEditor.onDelta(6, -1));
  expect(hapticLight).toHaveBeenCalledTimes(1);
  act(() => mockEditor.onCancel());
  expect(change.mock.lastCall![0]).toBe(p);
  expect(screen.queryByTestId('position-no-checkers')).toBeNull();
  jest.mocked(hapticLight).mockClear();
  act(() => mockEditor.onStart(6, yForCount(2)));
  expect(change.mock.lastCall![0].points[6].count).toBe(2);
  expect(hapticLight).not.toHaveBeenCalled();
});

it('edits both bar stacks directly with press location, reversible dragging and cancellation', () => {
  const p = newPosition(true);
  const change = jest.fn();
  const selected = jest.fn();
  render(<PositionBoardEditor position={p} dimensions={dims} location={null} onLocation={selected} onChange={change} />);
  const small = dims.checkerSize * 0.88;
  const third = 6 + small / 2 + 2 * (small + 2);
  act(() => mockEditor.onStart(0, dims.boardHeight - third));
  expect(selected).not.toHaveBeenCalled();
  expect(change.mock.lastCall![0].bar).toEqual({ white: 3, black: 0 });
  act(() => mockEditor.onDelta(0, -2));
  expect(change.mock.lastCall![0].bar.white).toBe(5);
  act(() => mockEditor.onDelta(0, 2));
  expect(change.mock.lastCall![0].bar.white).toBe(1);
  act(() => mockEditor.onCancel());
  expect(change.mock.lastCall![0]).toBe(p);
  fireEvent.press(screen.getByTestId('position-paint-black'));
  selected.mockClear();
  act(() => mockEditor.onStart(0, third));
  expect(selected).not.toHaveBeenCalled();
  expect(change.mock.lastCall![0].bar).toEqual({ white: 0, black: 3 });
  act(() => mockEditor.onDelta(0, 2));
  act(() => mockEditor.onEnd(0, false, 2));
  expect(change.mock.lastCall![0].bar.black).toBe(5);
  expect(change.mock.lastCall![0].borneOff.black).toBe(10);
});

it('places exact controls above top points and below bottom points without a settings toggle', () => {
  const p = newPosition();
  const change = jest.fn();
  const { rerender } = render(<PositionBoardEditor position={p} dimensions={dims} location={13} onLocation={jest.fn()} onChange={change} />);
  expect(within(screen.getByTestId('position-controls-top')).getByTestId('position-remove')).toBeTruthy();
  expect(screen.queryByTestId('position-fine-tune')).toBeNull();
  fireEvent.press(screen.getByTestId('position-remove'));
  expect(change.mock.lastCall![0].points[13].count).toBe(4);
  rerender(<PositionBoardEditor position={p} dimensions={dims} location={6} onLocation={jest.fn()} onChange={change} />);
  expect(within(screen.getByTestId('position-controls-bottom')).getByTestId('position-empty-point')).toBeTruthy();
  fireEvent.press(screen.getByTestId('position-empty-point'));
  expect(change.mock.lastCall![0].points[6].count).toBe(0);
});

it.each(['white', 'black'] as const)('edits the existing owner with %s selected, switches only after zero, and cancels safely', (selected) => {
  const other = selected === 'white' ? 'black' : 'white';
  const p = setPositionStack(newPosition(true), 6, other, 5);
  const change = jest.fn();
  render(<PositionBoardEditor position={p} dimensions={dims} location={null} onLocation={jest.fn()} onChange={change} />);
  fireEvent.press(screen.getByTestId(`position-paint-${selected}`));
  act(() => mockEditor.onStart(6, yForCount(3)));
  expect(change.mock.lastCall![0].points[6]).toEqual({ player: other, count: 3 });
  act(() => mockEditor.onDelta(6, -1));
  expect(change.mock.lastCall![0].points[6]).toEqual({ player: other, count: 4 });
  act(() => mockEditor.onDelta(6, 3));
  expect(change.mock.lastCall![0].points[6]).toEqual({ player: null, count: 0 });
  act(() => mockEditor.onDelta(6, 2));
  expect(change.mock.lastCall![0].points[6]).toEqual({ player: selected, count: 1 });
  expect(change.mock.lastCall![0].borneOff).toEqual({ [other]: 15, [selected]: 14 });
  act(() => mockEditor.onEnd(6, false, 2));
  expect(change.mock.lastCall![0].points[6]).toEqual({ player: selected, count: 1 });
  act(() => mockEditor.onStart(6, yForCount(3)));
  act(() => mockEditor.onDelta(6, 3));
  act(() => mockEditor.onCancel());
  expect(change.mock.lastCall![0]).toBe(p);
});

it('keeps ambient instructions and off-count captions out of the board workspace', () => {
  render(<PositionBoardEditor position={newPosition()} dimensions={dims} location={null} onLocation={jest.fn()} onChange={jest.fn()} />);
  expect(screen.queryByText('positions.off_counts')).toBeNull();
  expect(screen.queryByText('positions.drag_hint')).toBeNull();
});

it('uses the existing owner for accessible adjustments and the selected colour after clearing', () => {
  let p = setPositionStack(newPosition(true), 6, 'black', 3);
  const change = jest.fn();
  const view = () => <PositionBoardEditor position={p} dimensions={dims} location={6} onLocation={jest.fn()} onChange={change} />;
  const { rerender } = render(view());
  act(() => mockEditor.onAdjust(6, 1));
  p = change.mock.lastCall![0];
  expect(p.points[6]).toEqual({ player: 'black', count: 4 });
  rerender(view());
  fireEvent.press(screen.getByTestId('position-empty-point'));
  p = change.mock.lastCall![0];
  expect(p.points[6]).toEqual({ player: null, count: 0 });
  rerender(view());
  fireEvent.press(screen.getByTestId('position-add'));
  expect(change.mock.lastCall![0].points[6]).toEqual({ player: 'white', count: 1 });
});

it('resizes the touched occupied bar with the other colour selected, then switches at zero', () => {
  const p = setPositionStack(setPositionStack(newPosition(true), 'black-bar', 'black', 3), 'white-bar', 'white', 2);
  const change = jest.fn();
  const selected = jest.fn();
  render(<PositionBoardEditor position={p} dimensions={dims} location="black-bar" onLocation={selected} onChange={change} />);
  act(() => mockEditor.onAdjust(0, 1));
  expect(change.mock.lastCall![0].bar).toEqual({ white: 2, black: 4 });
  const small = dims.checkerSize * 0.88;
  selected.mockClear();
  act(() => mockEditor.onStart(0, 6 + small / 2 + 2 * (small + 2)));
  expect(selected).not.toHaveBeenCalled();
  act(() => mockEditor.onDelta(0, 1));
  expect(change.mock.lastCall![0].bar).toEqual({ white: 2, black: 4 });
  act(() => mockEditor.onDelta(0, -3));
  expect(change.mock.lastCall![0].bar).toEqual({ white: 2, black: 0 });
  act(() => mockEditor.onDelta(0, -2));
  expect(change.mock.lastCall![0].bar).toEqual({ white: 3, black: 0 });
  expect(selected).not.toHaveBeenCalled();
  act(() => mockEditor.onCancel());
  expect(change.mock.lastCall![0]).toBe(p);
});

it('defers selection layout until release so a new control row cannot shift an active drag', () => {
  const select = jest.fn();
  render(<PositionBoardEditor position={newPosition(true)} dimensions={dims} location={null} onLocation={select} onChange={jest.fn()} />);
  expect(screen.queryByTestId('position-controls-top')).toBeNull();
  expect(screen.queryByTestId('position-controls-bottom')).toBeNull();
  act(() => mockEditor.onStart(13, yForCount(2, true)));
  act(() => mockEditor.onDelta(13, 1));
  expect(select).not.toHaveBeenCalled();
  act(() => mockEditor.onEnd(13, false, 1));
  expect(select).toHaveBeenLastCalledWith(13);
});
