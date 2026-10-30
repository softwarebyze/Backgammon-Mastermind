import { computerCubeAction } from './computer-cube';
import { createPositionState } from './create-position';
import { createMatch, offerDouble } from './match';

function position(advantage: 'black' | 'white' | 'even' = 'even') {
  return createPositionState({ mode: 'vs-computer', currentPlayer: 'black', match: createMatch(5), placements: [
    { point: advantage === 'black' ? 23 : 10, player: 'black', count: 15 },
    { point: advantage === 'white' ? 2 : 15, player: 'white', count: 15 },
  ] });
}

it('offers with a large advantage and holds an even cube', () => {
  expect(computerCubeAction(position('black'))).toBe('offer');
  expect(computerCubeAction(position())).toBeNull();
});
it('takes a playable offer and drops a badly losing position', () => {
  for (const [advantage, action] of [['even', 'accept'], ['white', 'drop']] as const) {
    const state = offerDouble({ ...position(advantage), currentPlayer: 'white' }, 0);
    expect(computerCubeAction(state)).toBe(action);
  }
});
it('changes a legal take decision with the match score', () => {
  const state = createPositionState({ mode: 'vs-computer', currentPlayer: 'white', match: createMatch(5), placements: [
    { point: 10, player: 'black', count: 15 },
    { point: 12, player: 'white', count: 15 },
  ] });
  expect(computerCubeAction(offerDouble(state, 0))).toBe('drop');
  // A drop now leaves Black 5-away/White 1-away. Taking gives Black a
  // better continuation in this model, despite the same poor board.
  const nearMatchPoint = { ...state, match: { ...state.match!, score: { black: 0, white: 3 } } };
  expect(offerDouble(nearMatchPoint, 0).match?.pendingOffer).toBe('white');
  expect(computerCubeAction(offerDouble(nearMatchPoint, 0))).toBe('accept');
});
it('respects Crawford, dead cube, ownership, opening, human turns and pending answers', () => {
  const s = position('black');
  expect(computerCubeAction({ ...s, phase: 'opening-roll' })).toBeNull();
  expect(computerCubeAction({ ...s, currentPlayer: 'white' })).toBeNull();
  for (const patch of [{ crawford: true }, { cube: { value: 1, owner: 'white' as const } }, { score: { black: 4, white: 0 } }, { pendingOffer: 'black' as const }])
    expect(computerCubeAction({ ...s, match: { ...s.match!, ...patch } })).toBeNull();
});
