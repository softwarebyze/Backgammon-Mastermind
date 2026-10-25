import type { CheckerSlide, MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game';
import { useCallback, useRef, useState } from 'react';
import { countAtPoint, displayCommittedCount } from '@/features/game/move-animation';
import { BEAR_OFF } from '@/lib/game/constants';

/** Visual-only flights: logical history is already committed before these land. */

export function useCommittedFlights(onIdle: () => void) {
  const [frames, setFrames] = useState<MoveAnimationFrame[]>([]);
  const live = useRef<MoveAnimationFrame[]>([]);
  const serial = useRef(0);
  const generation = useRef(0);
  const landed = useRef(new Set<number>());
  const consumed = useRef(new Set<string>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const idleRef = useRef(onIdle);
  idleRef.current = onIdle;
  const reset = useCallback(() => {
    generation.current++;
    for (const timer of timers.current.values()) {
      clearTimeout(timer);
    }
    timers.current.clear();
    landed.current.clear();
    consumed.current.clear();
    live.current = [];
    setFrames([]);
  }, []);

  const add = useCallback((input: MoveAnimationFrame, before: GameState) => {
    const dependencies = new Set<number>();
    const prepare = (slide: CheckerSlide): CheckerSlide & { consumesArrival: boolean } => {
      const count = slide.from === BEAR_OFF ? before.borneOff[slide.player] : countAtPoint(before, slide.from, slide.player);
      const visible = displayCommittedCount({ point: slide.from, player: slide.player, count }, live.current.length ? { ...live.current[0]!, parallel: live.current } : null);
      // Reserve an individual arrival, not just a point count: two flights
      // converging on one point must feed two distinct reverse continuations.
      const slot = visible === 0
        ? live.current.flatMap(frame => [
            { frame, slide: frame, key: `${frame.id}-mover` },
            ...(frame.capture ? [{ frame, slide: frame.capture, key: `${frame.id}-capture` }] : []),
          ]).findLast(({ slide: candidate, key }) => candidate.to === slide.from && candidate.player === slide.player && !consumed.current.has(key))
        : undefined;
      const arrival = slot?.frame;
      if (slot) {
        consumed.current.add(slot.key);
      }
      if (arrival && !landed.current.has(arrival.id!)) {
        dependencies.add(arrival.id!);
      }
      // A landed overlay may be retained to reserve a stack slot. Once it is
      // consumed its slot must disappear, otherwise it duplicates the departure.
      if (arrival && landed.current.has(arrival.id!)) {
        live.current = live.current.filter(frame => frame.id !== arrival.id);
      }
      return {
        ...slide,
        sourceStackCount: arrival ? count : visible,
        consumesArrival: !!arrival && !landed.current.has(arrival.id!),
        consumesArrivalOf: slot?.key,
      };
    };
    const mover = prepare(input);
    const capture = input.capture ? prepare(input.capture) : undefined;
    const id = ++serial.current;
    const gen = generation.current;
    const finish = () => {
      if (gen !== generation.current || !timers.current.has(id) || landed.current.has(id)) {
        return;
      }
      clearTimeout(timers.current.get(id));
      timers.current.delete(id);
      landed.current.add(id);
      const children = live.current.filter(frame => frame.waitForIds?.includes(id));
      if (children.length) {
        live.current = live.current.filter(frame => frame.id !== id).map((frame) => {
          if (!frame.waitForIds?.includes(id)) {
            return frame;
          }
          const waitForIds = frame.waitForIds.filter(parent => parent !== id);
          if (!waitForIds.length) {
            timers.current.set(frame.id!, setTimeout(frame.onFinish, (frame.durationMs ?? 620) + 160));
          }
          return { ...frame, waitForIds, waitFor: waitForIds[0] };
        });
      }
      if (live.current.every(frame => landed.current.has(frame.id!))) {
        live.current = [];
        landed.current.clear();
        consumed.current.clear();
        setFrames([]);
        idleRef.current();
      }
      else {
        setFrames(live.current);
      }
      input.onFinish();
    };
    const waitForIds = [...dependencies];
    const frame: MoveAnimationFrame = { ...input, ...mover, capture, id, committed: true, waitFor: waitForIds[0], waitForIds, onFinish: finish };
    live.current = [...live.current, frame];
    setFrames(live.current);
    if (!dependencies.size) {
      timers.current.set(id, setTimeout(finish, (frame.durationMs ?? 620) + 160));
    }
  }, []);
  const hasFlights = useCallback(() => live.current.length > 0, []);
  return { frames, add, reset, hasFlights };
}
