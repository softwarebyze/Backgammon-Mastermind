import { createPositionState } from './create-position';
import { resolveGnuPlay } from './gnu-play';
import { encodeXgidBoard, toXgid } from './xgid';

describe('xgid', () => {
  it('encodes the standard opening board', () => {
    const state = createPositionState({ useStandardSetup: true });
    expect(encodeXgidBoard(state)).toBe('-b----E-C---eE---c-e----B-');
  });

  it('builds an XGID for white to play 3-1', () => {
    const state = createPositionState({
      useStandardSetup: true,
      dice: [3, 1],
      currentPlayer: 'white',
    });
    expect(toXgid(state)).toBe(
      'XGID=-b----E-C---eE---c-e----B-:0:0:1:31:0:0:0:0:10',
    );
  });

  it('builds an XGID for black to play', () => {
    const state = createPositionState({
      useStandardSetup: true,
      dice: [4, 2],
      currentPlayer: 'black',
    });
    expect(toXgid(state)).toContain(':0:0:-1:42:');
  });
});

describe('resolveGnuPlay', () => {
  it('maps Magriel 3-1 (8/5 6/5) for white', () => {
    const state = createPositionState({
      useStandardSetup: true,
      dice: [3, 1],
      currentPlayer: 'white',
    });
    const moves = resolveGnuPlay(state, '8/5 6/5');
    expect(moves).not.toBeNull();
    expect(moves!.map(m => `${m.from}/${m.to}`)).toEqual(['8/5', '6/5']);
  });

  it('maps Magriel 4-2 for white', () => {
    const state = createPositionState({
      useStandardSetup: true,
      dice: [4, 2],
      currentPlayer: 'white',
    });
    const moves = resolveGnuPlay(state, '8/4 6/4');
    expect(moves!.map(m => `${m.from}/${m.to}`)).toEqual(['8/4', '6/4']);
  });

  it('mirrors points for black on roll', () => {
    const state = createPositionState({
      useStandardSetup: true,
      dice: [3, 1],
      currentPlayer: 'black',
    });
    // Black's 8/5 6/5 → absolute 17/20 and 19/20
    const moves = resolveGnuPlay(state, '8/5 6/5');
    expect(moves!.map(m => `${m.from}/${m.to}`).sort()).toEqual(
      ['17/20', '19/20'].sort(),
    );
  });
});
