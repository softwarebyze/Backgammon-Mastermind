import { cleanup, screen, setup } from '@/lib/test-utils';

import { LearnProgressRing } from './learn-progress-ring';

jest.mock('@/lib/i18n', () => ({
  translate: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key,
}));

afterEach(cleanup);

describe('learnProgressRing', () => {
  it('exposes done/total progress to assistive tech', () => {
    setup(<LearnProgressRing done={3} total={7} />);

    const ring = screen.getByTestId('learn-progress-ring');
    expect(ring.props.accessible).toBe(true);
    expect(ring.props.accessibilityRole).toBe('progressbar');
    expect(ring.props.accessibilityValue).toEqual({ min: 0, max: 7, now: 3 });
  });

  it('clamps progress when more lessons than expected are completed', () => {
    setup(<LearnProgressRing done={9} total={7} />);

    expect(screen.getByTestId('learn-progress-ring').props.accessibilityValue).toEqual({
      min: 0,
      max: 7,
      now: 7,
    });
  });
});
