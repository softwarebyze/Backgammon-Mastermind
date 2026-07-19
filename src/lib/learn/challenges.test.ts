import { createPositionState } from '@/lib/game/create-position';
import { getLegalMoves } from '@/lib/game/moves';

import {
  CHALLENGES,
  getChallenge,
  getNextChallengeId,
  isChallengeUnlocked,
} from './challenges';

describe('challenges', () => {
  it('unlocks challenges based on prerequisites', () => {
    expect(isChallengeUnlocked('roll-move', [])).toBe(true);
    expect(isChallengeUnlocked('find-home', [])).toBe(false);
    expect(isChallengeUnlocked('find-home', ['roll-move'])).toBe(true);
  });

  it('routes the last challenge to null', () => {
    expect(getNextChallengeId('opening-roll')).toBeNull();
    expect(getNextChallengeId('roll-move')).toBe('find-home');
  });

  it('every challenge id resolves to a definition', () => {
    for (const challenge of CHALLENGES) {
      expect(getChallenge(challenge.id)).toBe(challenge);
    }
  });

  it('ensures every tryMove accepted path is legal from its position', () => {
    for (const challenge of CHALLENGES) {
      if (challenge.step.kind !== 'tryMove') {
        continue;
      }
      const state = createPositionState(challenge.position);
      for (const move of challenge.step.acceptedMoves) {
        const legal = getLegalMoves(state).some(
          candidate => candidate.from === move.from && candidate.to === move.to,
        );
        expect({
          challenge: challenge.id,
          move,
          legal,
        }).toEqual({
          challenge: challenge.id,
          move,
          legal: true,
        });
      }
    }
  });
});
