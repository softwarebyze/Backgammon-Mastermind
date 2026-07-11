import { dragOverlayFingerLift } from '@/features/game/drag-overlay-offset';

describe('dragOverlayFingerLift', () => {
  it('lifts roughly one checker above the finger', () => {
    expect(dragOverlayFingerLift(24)).toBe(22);
    expect(dragOverlayFingerLift(32)).toBe(29);
  });

  it('stays below 1× checker size so the piece still reads as under the touch', () => {
    expect(dragOverlayFingerLift(28)).toBeLessThan(28);
  });
});
