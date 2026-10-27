import type { StackEditHandlers } from '@/features/game/components/board/use-stack-edit-gesture';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { newPosition } from '@/lib/positions/position';
import { setPositionStack } from '@/lib/positions/set-stack';
import { PositionBoardEditor } from './position-board-editor';

let mockEditor: StackEditHandlers;
jest.mock('@/features/game/components/board/board-view', () => ({ BoardView: ({ stackEditor }: { stackEditor: StackEditHandlers }) => {
  mockEditor = stackEditor;
  return null;
} }));
jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key }));

const dims = fitBoardToViewport(380, 310);

it('keeps a drag anchored to its starting snapshot and restores it on cancellation', () => {
  const p = setPositionStack(newPosition(true), 6, 'white', 5);
  const change = jest.fn();
  render(<PositionBoardEditor position={p} dimensions={dims} location={null} onLocation={jest.fn()} onChange={change} />);
  act(() => mockEditor.onStart(6));
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
  act(() => mockEditor.onStart(13));
  act(() => mockEditor.onDelta(13, 3));
  expect(change.mock.lastCall![0].points[13]).toEqual({ player: 'black', count: 3 });
  act(() => mockEditor.onEnd(13, false));
  expect(change).toHaveBeenCalledTimes(1);
  act(() => mockEditor.onStart(6));
  act(() => mockEditor.onEnd(6, true));
  expect(change.mock.lastCall![0].points[6]).toEqual({ player: 'black', count: 1 });
  act(() => mockEditor.onAdjust(0, 1));
  expect(change.mock.lastCall![0].bar.black).toBe(1);
});
