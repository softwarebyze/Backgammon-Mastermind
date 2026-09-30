import {
  blunderDetailsSummary,
  blunderQuestionBody,
  blunderSeverity,
  candidateRows,
  equityExplainer,
  formatHintNotation,
  formatPoints,
} from './guidance-copy';

describe('guidance copy', () => {
  describe('blunderSeverity', () => {
    it('labels large losses as big blunders', () => {
      expect(blunderSeverity(0.2)).toBe('Big blunder');
      expect(blunderSeverity(0.16)).toBe('Big blunder');
    });

    it('labels medium losses as mistakes', () => {
      expect(blunderSeverity(0.159)).toBe('Mistake');
      expect(blunderSeverity(0.08)).toBe('Mistake');
    });

    it('labels small losses as slips', () => {
      expect(blunderSeverity(0.079)).toBe('Slip');
      expect(blunderSeverity(0.04)).toBe('Slip');
    });

    it('labels tiny losses as fine (matches the meter band)', () => {
      expect(blunderSeverity(0.039)).toBe('Fine');
      expect(blunderSeverity(0.01)).toBe('Fine');
    });
  });

  describe('formatPoints', () => {
    it('always shows a sign and two decimals', () => {
      expect(formatPoints(0.117)).toBe('+0.12');
      expect(formatPoints(-0.394)).toBe('−0.39');
      expect(formatPoints(0)).toBe('+0.00');
    });
  });

  describe('blunderQuestionBody', () => {
    it('explains the mistake without leaking the recommended move', () => {
      const body = blunderQuestionBody(3, 18, 0.117);
      expect(body).toContain('ranked 3 of 18');
      expect(body).toContain('18 ways');
      expect(body).toContain('0.12 points per game');
      // The answer must stay hidden in the question view.
      expect(body).not.toMatch(/\d+\/\d+/);
    });

    it('reads naturally for a single-candidate position', () => {
      expect(blunderQuestionBody(1, 1, 0.08)).toContain('ranked 1 of 1');
    });
  });

  describe('blunderDetailsSummary', () => {
    it('recaps rank, field size, and cost plainly', () => {
      const summary = blunderDetailsSummary(3, 18, 0.117);
      expect(summary).toBe(
        'Your move ranked 3 of 18, scoring about 0.12 points per game less than the best move.',
      );
    });

    it('defines points per game without circular wording', () => {
      // "average points a move earns" defined points with points; the new
      // explainer attributes the score to the engine and states it plainly.
      expect(equityExplainer()).toBe(
        'The engine scores each move by the points it expects to win per game, on average. Higher is better.',
      );
      expect(equityExplainer()).not.toMatch(/average points/i);
    });

    it('keeps the first sentence and states the cost as a comparison', () => {
      const body = blunderQuestionBody(5, 12, 0.351);
      expect(body).toBe(
        'Your move ranked 5 of 12 ways to play this roll. '
        + 'On average, it scores about 0.35 points per game less than the best move.',
      );
    });
  });
});

describe('guidance copy details', () => {
  describe('candidateRows', () => {
    it('labels the top row and marks the played row', () => {
      const rows = candidateRows([0.5, 0.42, 0.38], 3);
      expect(rows[0]).toEqual({ label: 'Best', equity: '+0.50 pts', vsBest: null });
      expect(rows[1]).toEqual({ label: '2', equity: '+0.42 pts', vsBest: '−0.08 vs best' });
      expect(rows[2]).toEqual({ label: '3 (yours)', equity: '+0.38 pts', vsBest: '−0.12 vs best' });
    });

    it('caps the displayed rows at four', () => {
      const rows = candidateRows([0.5, 0.4, 0.3, 0.2, 0.1, 0.0, -0.1], 7);
      expect(rows).toHaveLength(4);
      expect(rows[3].label).toBe('4');
    });

    it('returns nothing for an empty candidate list', () => {
      expect(candidateRows([], 1)).toEqual([]);
    });
  });

  describe('formatHintNotation', () => {
    it('joins moves with a middle dot', () => {
      expect(formatHintNotation([{ from: 13, to: 10 }, { from: 8, to: 7 }])).toBe('13/10 · 8/7');
    });

    it('labels bar and bear-off', () => {
      expect(formatHintNotation([{ from: 0, to: 20 }, { from: 6, to: 25 }])).toBe('bar/20 · 6/off');
    });
  });
});
