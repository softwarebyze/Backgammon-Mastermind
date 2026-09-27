/**
 * The direction lane is authored for LTR, but React Native mirrors the board
 * itself in an RTL locale. Without reflecting the lane it exits on the wrong end
 * of the board and the arrow points against the direction of play.
 */
import type { ReactTestInstance } from 'react-test-renderer';

import { G } from 'react-native-svg';

import { DirectionOverlay } from '@/features/game/components/board/direction-overlay';
import { render } from '@/lib/test-utils';
import { horseshoeArrowhead } from '@/lib/ui/arrow-geometry';

const WIDTH = 400;
const HEIGHT = 300;

/** The horizontal reflection the overlay applies via its SVG transform. */
const mirrorX = (x: number) => WIDTH - x;

function groupTransformsFor(rtl: boolean): string[] {
  const { UNSAFE_root: root } = render(
    <DirectionOverlay width={WIDTH} height={HEIGHT} player="white" rtl={rtl} />,
  );
  return (root as ReactTestInstance)
    .findAll(node => node.type === G)
    .map(g => String((g.props as { transform?: unknown }).transform));
}

describe('direction overlay orientation', () => {
  it('wraps the lane in a horizontal reflection in RTL', () => {
    const transforms = groupTransformsFor(true);
    expect(transforms).toContain(`translate(${WIDTH} 0) scale(-1 1)`);
  });

  it('leaves the lane untransformed in LTR', () => {
    expect(groupTransformsFor(false)).not.toContain(`translate(${WIDTH} 0) scale(-1 1)`);
  });

  it('moves the lane exit to the bear-off side in RTL', () => {
    // LTR play travels right, toward the bear-off on the right edge.
    const ltr = horseshoeArrowhead(WIDTH, HEIGHT, 'white');
    expect(ltr.lineEnd.x).toBeGreaterThan(WIDTH / 2);

    // Reflected, the exit sits on the left — where the bear-off renders in RTL.
    expect(mirrorX(ltr.lineEnd.x)).toBeLessThan(WIDTH / 2);
  });
});
