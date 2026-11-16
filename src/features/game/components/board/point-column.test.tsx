import type { ComponentProps } from 'react';
import { cleanup, fireEvent, render, screen } from '@/lib/test-utils';
import { BarArea } from './bar-area';
import { PointColumn } from './point-column';

afterEach(cleanup);

const dragHandlers = {
  onDragStart: jest.fn(),
  onDragMove: jest.fn(),
  onDragEnd: jest.fn(),
};

function column(props: Partial<ComponentProps<typeof PointColumn>>) {
  return (
    <PointColumn
      pointIndex={5}
      point={{ player: 'white', count: 5 }}
      isTop={false}
      isSelected={false}
      isLegalTarget={false}
      isMovableSource={false}
      showGhost={false}
      ghostPlayer={null}
      onPress={jest.fn()}
      colWidth={24}
      pointHeight={120}
      checkerSize={22}
      {...dragHandlers}
      {...props}
    />
  );
}

function bar(props: Partial<ComponentProps<typeof BarArea>>) {
  return (
    <BarArea
      whiteCount={1}
      blackCount={0}
      currentPlayer="white"
      selectedPoint={null}
      onPressBar={jest.fn()}
      barWidth={28}
      boardHeight={300}
      middleHeight={12}
      checkerSize={24}
      {...dragHandlers}
      {...props}
    />
  );
}

// A tap that ends the turn turns dragging off for the column under the finger.
// Remounting it there loses the touch end, and the next press anywhere with it.
it.each([
  ['point column', column, 'point-5'],
  ['bar', bar, 'board-bar'],
] as const)('keeps the %s mounted when dragging turns off and on', (_name, element, testID) => {
  const { rerender } = render(element({ dragEnabled: true }));
  const mounted = screen.getByTestId(testID);
  rerender(element({ dragEnabled: false }));
  expect(screen.getByTestId(testID)).toBe(mounted);
  rerender(element({ dragEnabled: true }));
  expect(screen.getByTestId(testID)).toBe(mounted);
});

it('still presses a point column directly while dragging is off', () => {
  const onPress = jest.fn();
  render(column({ dragEnabled: false, onPress }));
  fireEvent.press(screen.getByTestId('point-5'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
