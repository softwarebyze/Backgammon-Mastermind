import { matchOfferText, matchPlayer, matchResultText } from '@/features/game/match-copy';
import { createMatch } from '@/lib/game/match';

it('speaks to the player against the computer instead of naming colours', () => {
  expect(matchOfferText({ offerer: 'black', value: 2, points: 1 }, 'vs-computer')).toBe('The computer offers a double to 2. Accept or drop? Dropping concedes 1.');
  expect(matchOfferText({ offerer: 'white', value: 4, points: 2 }, 'vs-computer')).toBe('You offer a double to 4.');
  expect(matchPlayer('black', 'vs-computer')).toBe('Computer');
  // Two players on one device keep the colours.
  expect(matchOfferText({ offerer: 'black', value: 2, points: 1 }, 'vs-human')).toBe('Black offers a double to 2. White: accept or drop. Dropping concedes 1.');
});

it('says "You win" for the human and names the computer when it wins', () => {
  const won = { ...createMatch(3), result: { winner: 'white' as const, points: 1, kind: 'single' as const } };
  expect(matchResultText(won, 'vs-computer')).toBe('You win 1 · single');
  expect(matchResultText({ ...won, winner: 'white' }, 'vs-computer')).toBe('You win the match · +1');
  const lost = { ...won, result: { ...won.result, winner: 'black' as const } };
  expect(matchResultText(lost, 'vs-computer')).toBe('Computer wins 1 · single');
  expect(matchResultText(createMatch(3), 'vs-computer')).toBeNull();
});
