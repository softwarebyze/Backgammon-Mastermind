/**
 * The direction lane is authored for the fixed board. Locale RTL must not
 * reflect it — the board itself stays left-to-right.
 */
import type { ReactTestInstance } from 'react-test-renderer';

import { G } from 'react-native-svg';

import { DirectionOverlay } from '@/features/game/components/board/direction-overlay';
import { render, screen } from '@/lib/test-utils';

const WIDTH = 400;
const HEIGHT = 300;

describe('direction overlay orientation', () => {
  it('exposes the rendered lane to native visual verification', () => {
    render(<DirectionOverlay width={WIDTH} height={HEIGHT} player="white" />);
    expect(screen.getByTestId('direction-overlay').props.collapsable).toBe(false);
    expect(screen.getByTestId('direction-overlay').props.pointerEvents).toBe('none');
  });

  it('does not reflect the lane for an RTL locale', () => {
    const { UNSAFE_root: root } = render(
      <DirectionOverlay width={WIDTH} height={HEIGHT} player="white" />,
    );
    const transforms = (root as ReactTestInstance)
      .findAll(node => node.type === G)
      .map(g => String((g.props as { transform?: unknown }).transform));

    expect(transforms).not.toContain(`translate(${WIDTH} 0) scale(-1 1)`);
  });
});
