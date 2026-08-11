import { analyzePosition, formatMove } from '@/lib/coach/analyze-position';
import { buildCoachSystemPrompt } from '@/lib/coach/build-context';
import { createPositionState } from '@/lib/game/create-position';
import { applyDiceRoll, getLegalMoves } from '@/lib/game/moves';

/**
 * Review helpers for the POC: engine suggestion must be legal, and the
 * WebLLM system prompt must surface that suggestion for the model to use.
 */
describe('coach suggestion quality gates', () => {
  it('engine suggestion is always a legal landing for a standard 6-5', () => {
    let state = createPositionState({
      useStandardSetup: true,
      currentPlayer: 'white',
      mode: 'vs-computer',
    });
    state = applyDiceRoll(state, [6, 5]);
    const facts = analyzePosition(state);
    expect(facts.suggestedMove).not.toBeNull();
    const legal = getLegalMoves(state);
    const ok = legal.some(
      m => m.from === facts.suggestedMove!.from && m.to === facts.suggestedMove!.to,
    );
    expect(ok).toBe(true);
  });

  it('system prompt includes the engine move and legal-only instructions', () => {
    let state = createPositionState({
      useStandardSetup: true,
      currentPlayer: 'white',
      mode: 'vs-computer',
    });
    state = applyDiceRoll(state, [3, 1]);
    const facts = analyzePosition(state);
    const prompt = buildCoachSystemPrompt(state);
    expect(prompt).toMatch(/ONLY discuss moves from the legal list/i);
    expect(prompt).toMatch(/Engine pick/);
    if (facts.suggestedMove) {
      expect(prompt).toContain(formatMove(facts.suggestedMove));
    }
  });
});
