import { analyzePosition, formatMove, formatPoint } from '@/lib/coach/analyze-position';
import { matchCoachIntent } from '@/lib/coach/match-intent';
import { coachRespond, coachWelcome } from '@/lib/coach/respond';
import { createInitialState } from '@/lib/game/constants';
import { createPositionState } from '@/lib/game/create-position';
import { applyDiceRoll } from '@/lib/game/moves';

describe('formatPoint / formatMove', () => {
  it('labels bar and bear-off', () => {
    expect(formatPoint(0)).toBe('bar');
    expect(formatPoint(25)).toBe('off');
    expect(formatPoint(8)).toBe('8');
    expect(formatMove({ from: 8, to: 5, dieIndex: 0 })).toBe('8 → 5');
  });
});

describe('analyzePosition', () => {
  it('reports tied race on the opening setup', () => {
    const state = createInitialState('vs-computer');
    const facts = analyzePosition(state);
    expect(facts.pipLead).toBe('tied');
    expect(facts.whitePips).toBe(facts.blackPips);
    expect(facts.whiteBlots).toBe(0);
    expect(facts.blackBlots).toBe(0);
  });

  it('suggests a move when dice are in play', () => {
    let state = createPositionState({
      useStandardSetup: true,
      currentPlayer: 'white',
      mode: 'vs-computer',
    });
    state = applyDiceRoll(state, [3, 1]);
    const facts = analyzePosition(state);
    expect(facts.phase).toBe('moving');
    expect(facts.uniqueMoveCount).toBeGreaterThan(0);
    expect(facts.suggestedMove).not.toBeNull();
  });
});

describe('matchCoachIntent', () => {
  it('maps common questions', () => {
    expect(matchCoachIntent('What\'s the best move?')).toBe('best_move');
    expect(matchCoachIntent('explain this position')).toBe('explain_position');
    expect(matchCoachIntent('who is ahead in the race?')).toBe('race');
    expect(matchCoachIntent('how does hitting work?')).toBe('hitting');
    expect(matchCoachIntent('bearing off rules')).toBe('bearing_off');
    expect(matchCoachIntent('how do the dice work')).toBe('dice');
    expect(matchCoachIntent('which way do checkers move')).toBe('direction');
    expect(matchCoachIntent('give me a tip')).toBe('tip');
    expect(matchCoachIntent('asdf qwerty')).toBe('fallback');
  });
});

describe('coachRespond', () => {
  it('returns a welcome message', () => {
    const reply = coachWelcome();
    expect(reply.intent).toBe('welcome');
    expect(reply.text.length).toBeGreaterThan(20);
  });

  it('explains a moving position with engine suggestion', () => {
    let state = createPositionState({
      useStandardSetup: true,
      currentPlayer: 'white',
      mode: 'vs-computer',
    });
    state = applyDiceRoll(state, [6, 5]);
    const reply = coachRespond(state, { intent: 'best_move' });
    expect(reply.intent).toBe('best_move');
    expect(reply.text).toMatch(/→/);
  });

  it('answers free-text race questions', () => {
    const state = createInitialState('vs-human');
    const reply = coachRespond(state, { question: 'Who is ahead in the race?' });
    expect(reply.intent).toBe('race');
    expect(reply.text.toLowerCase()).toMatch(/pip/);
  });
});
