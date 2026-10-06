import {
  CHECKER_TRAVEL_EASE,
  checkerTravelDurationMs,
  COMPUTER_TRAVEL_MAX_MS,
  COMPUTER_TRAVEL_MIN_MS,
  HUMAN_TRAVEL_MAX_MS,
  HUMAN_TRAVEL_MIN_MS,
  travelPips,
} from '@/features/game/checker-travel';
import { computerAnticipationMs } from '@/lib/game/computer-pace';
import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';

const OLD_FLAT_HUMAN_MS = 360;
const OLD_FAST_COMPUTER_MS = 280;
const OLD_SLOW_COMPUTER_MS = 720;

describe('checker travel', () => {
  it('starts from rest instead of launching at full speed', () => {
    expect(CHECKER_TRAVEL_EASE.y1).toBe(0);
    expect(CHECKER_TRAVEL_EASE.x1).toBeGreaterThan(0);
    expect(CHECKER_TRAVEL_EASE.y2).toBe(1);
  });

  it('keeps a 1-pip human hop snappier than the old flat 360ms', () => {
    expect(travelPips(24, 23)).toBe(1);
    const hop = checkerTravelDurationMs({ from: 24, to: 23, pace: 'human' });
    expect(hop).toBe(HUMAN_TRAVEL_MIN_MS);
    expect(hop).toBeLessThan(OLD_FLAT_HUMAN_MS);
  });

  it('lets a long human run take longer than a hop, still near the old duration', () => {
    const run = checkerTravelDurationMs({ from: 24, to: 13, pace: 'human' });
    expect(run).toBeGreaterThan(OLD_FLAT_HUMAN_MS);
    expect(run).toBe(HUMAN_TRAVEL_MAX_MS - Math.round((HUMAN_TRAVEL_MAX_MS - HUMAN_TRAVEL_MIN_MS) / 11));
    expect(run).toBeLessThan(OLD_SLOW_COMPUTER_MS);
  });

  it('places computer travel between the old fast zip and the old slow slide', () => {
    const hop = checkerTravelDurationMs({ from: 1, to: 2, pace: 'computer' });
    const typical = checkerTravelDurationMs({ from: 13, to: 8, pace: 'computer' });
    expect(hop).toBe(COMPUTER_TRAVEL_MIN_MS);
    expect(hop).toBeGreaterThan(OLD_FAST_COMPUTER_MS);
    expect(typical).toBeGreaterThan(hop);
    expect(typical).toBeLessThan(OLD_SLOW_COMPUTER_MS);
    expect(typical).toBeLessThanOrEqual(COMPUTER_TRAVEL_MAX_MS);
  });

  it('spends more time sliding than waiting before a computer checker', () => {
    const travel = checkerTravelDurationMs({ from: 13, to: 8, pace: 'computer' });
    expect(computerAnticipationMs(3)).toBeLessThan(travel);
    expect(computerAnticipationMs(3)).toBeLessThan(COMPUTER_TRAVEL_MIN_MS);
  });

  it('treats bar entry and bear-off as short hops', () => {
    expect(travelPips(BAR_POINT, 24)).toBe(1);
    expect(travelPips(BAR_POINT, 19)).toBe(6);
    expect(travelPips(6, BEAR_OFF)).toBe(3);
    expect(checkerTravelDurationMs({ from: 6, to: BEAR_OFF })).toBeLessThan(
      checkerTravelDurationMs({ from: 13, to: 7 }),
    );
  });
});
