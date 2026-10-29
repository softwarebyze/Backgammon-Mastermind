import { newPosition } from './position';
import { beginStroke, endStroke, HISTORY_LIMIT, recordChange, redo, startHistory, undo } from './position-history';
import { setPositionStack } from './set-stack';

const standard = newPosition();
const empty = newPosition(true);
const withStack = (count: number) => setPositionStack(empty, 6, 'white', count);

describe('position history', () => {
  it('undoes and redoes single edits in order', () => {
    let h = startHistory(standard);
    h = recordChange(h, empty);
    h = recordChange(h, withStack(2));
    h = undo(h);
    expect(h.present).toBe(empty);
    h = undo(h);
    expect(h.present).toBe(standard);
    expect(undo(h)).toBe(h);
    h = redo(redo(h));
    expect(h.present).toEqual(withStack(2));
    expect(redo(h)).toBe(h);
  });

  it('records a whole drag as one step', () => {
    let h = beginStroke(startHistory(empty));
    for (const count of [1, 2, 3, 4])
      h = recordChange(h, withStack(count));
    expect(h.past).toHaveLength(0);
    h = endStroke(h);
    expect(h.past).toHaveLength(1);
    expect(undo(h).present).toBe(empty);
  });

  it('drops a cancelled or no-op drag and ignores repeated boards', () => {
    let h = beginStroke(startHistory(empty));
    h = recordChange(h, withStack(3));
    h = recordChange(h, empty);
    h = endStroke(h);
    expect(h.past).toHaveLength(0);
    expect(recordChange(h, newPosition(true))).toBe(h);
  });

  it('clears redo after a new edit and caps the past', () => {
    let h = recordChange(startHistory(standard), empty);
    h = recordChange(undo(h), withStack(1));
    expect(h.future).toHaveLength(0);
    for (let i = 0; i < HISTORY_LIMIT + 10; i++)
      h = recordChange(h, i % 2 ? withStack(1) : withStack(2));
    expect(h.past).toHaveLength(HISTORY_LIMIT);
  });
});
