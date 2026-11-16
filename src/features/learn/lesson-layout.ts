import type { LessonDefinition } from '@/lib/learn/curriculum';

/**
 * Portrait caption slot at 100% text size: step dots, title, a three-line
 * body, and a two-line feedback or completion card. Longer copy scrolls
 * inside the slot instead of pushing the board around.
 */
export const LEARN_CAPTION_RESERVE = 236;
const MAX_FONT_SCALE = 1.4;

/**
 * Fixed caption height for portrait lessons. It never depends on what the
 * caption currently shows, so feedback and the completion card cannot resize
 * or move the board. Capped so the board keeps its minimum slot.
 */
export function learnCaptionReserve({
  fontScale,
  captionMaxHeight,
}: {
  fontScale: number;
  captionMaxHeight: number | undefined;
}): number {
  const scale = Math.min(MAX_FONT_SCALE, Math.max(1, fontScale || 1));
  const wanted = Math.round(LEARN_CAPTION_RESERVE * scale);
  return captionMaxHeight == null ? wanted : Math.min(wanted, captionMaxHeight);
}

/** True when any step rolls dice, so the footer reserves the dice row on every step. */
export function lessonUsesDice(lesson: Pick<LessonDefinition, 'steps'>): boolean {
  return lesson.steps.some((step) => {
    const dice = step.position.dice;
    return dice != null && (dice[0] !== 0 || dice[1] !== 0);
  });
}
