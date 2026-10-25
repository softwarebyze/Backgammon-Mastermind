import type { MoveAnimationFrame } from './move-animation';
import { createPositionState } from '@/lib/game/create-position';
import { act, renderHook } from '@/lib/test-utils';
import { displayBarCountDuringAnimation, displayPointDuringAnimation } from './move-animation';
import { useCommittedFlights } from './use-committed-flights';

const before = createPositionState({
  placements: [{ point: 6, player: 'white', count: 15 }, { point: 3, player: 'black', count: 1 }, { point: 19, player: 'black', count: 14 }],
  dice: [3, 1],
  mode: 'vs-human',
});
function slide(from: number, to: number, player: 'white' | 'black' = 'white'): MoveAnimationFrame {
  return { from, to, player, sourceStackCount: 1, sourceDisplayCount: 0, destStackCount: 1, onFinish: () => {} };
}

it.each([false, true])('keeps a captured checker visible when the mover continues (parent already landed=%s)', (landed) => {
  const { result } = renderHook(() => useCommittedFlights(() => {}));
  const hit = { ...slide(6, 3), capture: slide(3, 0, 'black') };
  act(() => {
    result.current.add(hit, before);
    result.current.add(slide(19, 20, 'black'), before); // unrelated flight retains the landed stack slots
  });
  const parent = result.current.frames[0]!;
  if (landed) {
    act(() => parent.onFinish());
  }
  const afterHit = { ...before, points: before.points.map(p => ({ ...p })), bar: { white: 0, black: 1 } };
  afterHit.points[3] = { player: 'white', count: 1 };
  act(() => result.current.add(slide(3, 2), afterHit));
  if (!landed) {
    expect(result.current.frames.at(-1)!.waitFor).toBe(parent.id);
    act(() => parent.onFinish());
  }
  const retained = result.current.frames.find(f => f.id === parent.id)!;
  expect(retained).toBeDefined();
  expect(retained.hidden).toBe(true);
  expect(retained.capture).toMatchObject({ from: 3, to: 0, player: 'black' });
  expect(retained.capture?.hidden).not.toBe(true);
  const animation = { ...result.current.frames[0]!, parallel: result.current.frames };
  // The bar checker is represented by the capture overlay, exactly once.
  expect(displayBarCountDuringAnimation('black', 1, animation)).toBe(0);
  // Keep the capture reserved until the last outstanding flight settles.
  act(() => result.current.frames.find(f => f.from === 3 && f.to === 2)!.onFinish());
  expect(result.current.frames.find(f => f.id === parent.id)?.capture?.hidden).not.toBe(true);
  act(() => result.current.frames.find(f => f.from === 19)!.onFinish());
  expect(result.current.frames).toEqual([]);
  expect(displayBarCountDuringAnimation('black', 1, null)).toBe(1);
});

it.each([false, true])('retains the reverse mover when a restored capture continues (parent already landed=%s)', (landed) => {
  const { result } = renderHook(() => useCommittedFlights(() => {}));
  act(() => {
    result.current.add({ ...slide(3, 6), capture: slide(0, 3, 'black') }, before);
    result.current.add(slide(19, 20, 'black'), before);
  });
  const restore = result.current.frames[0]!;
  if (landed) {
    act(() => restore.onFinish());
  }
  const restored = { ...before, points: before.points.map(p => ({ ...p })) };
  act(() => result.current.add(slide(3, 2, 'black'), restored));
  if (!landed) {
    expect(result.current.frames.at(-1)!.waitFor).toBe(restore.id);
    act(() => restore.onFinish());
  }
  const retained = result.current.frames.find(f => f.id === restore.id)!;
  expect(retained.hidden).not.toBe(true);
  expect(retained.capture?.hidden).toBe(true);
  const animation = { ...result.current.frames[0]!, parallel: result.current.frames };
  expect(displayPointDuringAnimation(6, { player: 'white', count: 15 }, animation).count).toBe(14);
  act(() => result.current.reset());
  act(() => restore.onFinish());
  expect(result.current.frames).toEqual([]);
});
