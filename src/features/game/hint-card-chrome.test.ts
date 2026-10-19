import { hintCardChrome } from '@/features/game/hint-card-chrome';
import { REVIEW_SLOT_HEIGHT } from '@/features/game/hooks/use-board-dimensions';

// #241: in portrait the board gets whatever height the review strip and the
// controls leave. The open hint card is taller than the Hint button, so if
// the controls just grew, the board shrank every time the hint opened.
describe('hintCardChrome', () => {
  const CLOSED_CONTROLS = 144;
  const chromeBelowBoard = (layout: ReturnType<typeof hintCardChrome>) =>
    (layout.hideReview ? 0 : REVIEW_SLOT_HEIGHT) + (layout.controlsHeight ?? CLOSED_CONTROLS);

  it('keeps the strip plus controls the same height when the card opens in portrait', () => {
    const closed = hintCardChrome({ hintCardOpen: false, portrait: true, closedControlsHeight: CLOSED_CONTROLS });
    const open = hintCardChrome({ hintCardOpen: true, portrait: true, closedControlsHeight: CLOSED_CONTROLS });
    expect(closed).toEqual({ hideReview: false, controlsHeight: null });
    expect(open.hideReview).toBe(true);
    expect(chromeBelowBoard(open)).toBe(chromeBelowBoard(closed));
  });

  it('gives the card the strip\'s room: at least the 108px card fits beside the dice and caption', () => {
    const open = hintCardChrome({ hintCardOpen: true, portrait: true, closedControlsHeight: CLOSED_CONTROLS });
    // Closed controls hold a 52px Hint slot; the open card needs 108.
    expect(open.controlsHeight! - CLOSED_CONTROLS + 52).toBeGreaterThanOrEqual(108);
  });

  it('in landscape only moves the strip aside so the card fits in the side rail', () => {
    expect(hintCardChrome({ hintCardOpen: true, portrait: false, closedControlsHeight: CLOSED_CONTROLS }))
      .toEqual({ hideReview: true, controlsHeight: null });
    expect(hintCardChrome({ hintCardOpen: false, portrait: false, closedControlsHeight: CLOSED_CONTROLS }))
      .toEqual({ hideReview: false, controlsHeight: null });
  });

  it('does nothing before the closed controls have been measured', () => {
    expect(hintCardChrome({ hintCardOpen: true, portrait: true, closedControlsHeight: 0 }))
      .toEqual({ hideReview: false, controlsHeight: null });
  });
});
