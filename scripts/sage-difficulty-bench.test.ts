import { createPositionState } from '../src/lib/game/create-position';
import { applyBenchResult, emptyBenchTally, parseBenchSide, scoreBenchGame } from './sage-bench-rules';

describe('parseBenchSide', () => {
  it('rejects a typo instead of playing Classic', () => {
    expect(() => parseBenchSide('intermedate')).toThrow(/intermedate/);
  });

  it('rejects a temperature that is not a number', () => {
    expect(() => parseBenchSide('t.')).toThrow(/t\./);
  });

  it('accepts the named levels and the calibration spellings', () => {
    expect(parseBenchSide('classic')).toBeNull();
    expect(parseBenchSide('expert')).toEqual({ ply: 1, temperature: 0 });
    expect(parseBenchSide('t0.2')).toEqual({ ply: 1, temperature: 0.2 });
    expect(parseBenchSide('p2t0.02')).toEqual({ ply: 2, temperature: 0.02 });
    expect(parseBenchSide('lookahead')).toEqual({ ply: 1, temperature: 0, lookahead: true });
  });
});

describe('scoreBenchGame', () => {
  it('does not score a game that never finished', () => {
    const unfinished = createPositionState({ useStandardSetup: true });
    expect(unfinished.winner).toBeNull();
    expect(scoreBenchGame(unfinished)).toBeNull();
  });

  it('does not count that unfinished game as a win for Black', () => {
    const tally = emptyBenchTally();
    applyBenchResult(tally, scoreBenchGame(createPositionState({ useStandardSetup: true })), false);
    expect(tally).toEqual({ aWins: 0, aPoints: 0, scored: 0, capped: 1 });
  });

  it('scores a finished game', () => {
    const won = createPositionState({
      useStandardSetup: true,
      currentPlayer: 'white',
    });
    won.winner = 'white';
    won.phase = 'game-over';
    won.borneOff = { white: 15, black: 1 };
    const tally = emptyBenchTally();
    applyBenchResult(tally, scoreBenchGame(won), true);
    expect(tally).toEqual({ aWins: 1, aPoints: 1, scored: 1, capped: 0 });
  });
});
