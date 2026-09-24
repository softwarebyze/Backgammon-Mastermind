import {
  blunderDetailsSummary,
  blunderQuestionBody,
  blunderSeverity,
  candidateRows,
  formatHintNotation,
  formatPoints,
  ordinal,
} from './guidance-copy';

describe('guidance copy', () => {
  describe('blunderSeverity', () => {
    it('labels large losses as big blunders', () => {
      expect(blunderSeverity(0.2)).toBe('Big blunder');
      expect(blunderSeverity(0.15)).toBe('Big blunder');
    });

    it('labels medium losses as mistakes', () => {
      expect(blunderSeverity(0.149)).toBe('Mistake');
      expect(blunderSeverity(0.08)).toBe('Mistake');
    });

    it('labels small losses as small slips', () => {
      expect(blunderSeverity(0.079)).toBe('Small slip');
      expect(blunderSeverity(0.01)).toBe('Small slip');
    });
  });

  describe('ordinal', () => {
    it('handles the teens correctly', () => {
      expect(ordinal(1)).toBe('1st');
      expect(ordinal(2)).toBe('2nd');
      expect(ordinal(3)).toBe('3rd');
      expect(ordinal(4)).toBe('4th');
      expect(ordinal(11)).toBe('11th');
      expect(ordinal(12)).toBe('12th');
      expect(ordinal(13)).toBe('13th');
      expect(ordinal(21)).toBe('21st');
      expect(ordinal(22)).toBe('22nd');
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
      expect(body).toContain('3rd-best');
      expect(body).toContain('18 ways');
      expect(body).toContain('0.12 points per game');
      // The answer must stay hidden in the question view.
      expect(body).not.toMatch(/\d+\/\d+/);
    });

    it('reads naturally for a single-candidate position', () => {
      expect(blunderQuestionBody(1, 1, 0.08)).toContain('best of 1 way');
    });
  });

  describe('blunderDetailsSummary', () => {
    it('recaps rank, field size, and cost plainly', () => {
      const summary = blunderDetailsSummary(3, 18, 0.117);
      expect(summary).toBe(
        'Your move ranked 3rd of 18 and gives up about 0.12 points per game versus the best move.',
      );
    });
  });

  describe('candidateRows', () => {
    it('labels the top row and marks the played row', () => {
      const rows = candidateRows([0.5, 0.42, 0.38], 3);
      expect(rows[0]).toEqual({ label: 'Best', equity: '+0.50 pts', vsBest: null });
      expect(rows[1]).toEqual({ label: '2nd', equity: '+0.42 pts', vsBest: '−0.08 vs best' });
      expect(rows[2]).toEqual({ label: '3rd (yours)', equity: '+0.38 pts', vsBest: '−0.12 vs best' });
    });

    it('caps the displayed rows at four', () => {
      const rows = candidateRows([0.5, 0.4, 0.3, 0.2, 0.1, 0.0, -0.1], 7);
      expect(rows).toHaveLength(4);
      expect(rows[3].label).toBe('4th');
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
