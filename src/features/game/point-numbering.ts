import type { Player } from '@/lib/game/types';

/**
 * Label for physical point `n` from `perspective`'s point of view.
 *
 * Each player's 1-point is their own ace-point: white's is physical point 1,
 * black's is physical point 24, so black's labels read 25 - n.
 */
export function pointNumberLabel(n: number, perspective: Player): number {
  return perspective === 'white' ? n : 25 - n;
}

/**
 * Whose point of view the point-number rails are labeled from.
 *
 * The numbers follow the side whose turn is on screen: live that's the side
 * to move; in review it's the player whose turn is being reviewed.
 */
export function resolveNumberPerspective(args: {
  isReviewing: boolean;
  reviewedPlayer: Player | null;
  currentPlayer: Player;
}): Player {
  return args.isReviewing && args.reviewedPlayer ? args.reviewedPlayer : args.currentPlayer;
}
