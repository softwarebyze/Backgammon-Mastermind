import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import type { LessonId } from '@/lib/learn/curriculum';

type FeatherName = ComponentProps<typeof Feather>['name'];

export type LessonVisual = {
  icon: FeatherName;
  /** Warm tint used for the icon chip and the lesson accent line. */
  tint: string;
};

/**
 * One icon + tint per lesson. Kept together so the hub and lesson screen stay
 * consistent, and so a new lesson id fails the coverage test instead of
 * silently rendering a blank chip.
 */
const LESSON_VISUALS: Record<LessonId, LessonVisual> = {
  'goal-board': { icon: 'target', tint: '#FF8933' },
  'direction-setup': { icon: 'compass', tint: '#FFC499' },
  'moving-dice': { icon: 'play-circle', tint: '#FFB067' },
  'hitting-bar': { icon: 'zap', tint: '#FF7A68' },
  'bearing-off': { icon: 'log-out', tint: '#4ADE80' },
  'pip-count': { icon: 'activity', tint: '#7DD3FC' },
  'strategies': { icon: 'map', tint: '#C4B5FD' },
};

export function lessonVisual(id: LessonId): LessonVisual {
  return LESSON_VISUALS[id];
}
