/**
 * The playing surface inherits RTL from the app root, and Yoga mirrors absolute
 * `left` inside an RTL container. The floating checker proxies (move slides and
 * drag ghosts) are positioned from board-space pixels that `mirrorX` has
 * already flipped for RTL, so rendering them directly in that surface mirrors
 * them a second time and sends them across the board the wrong way.
 *
 * They must therefore be hosted in an explicitly LTR layer. These tests pin that
 * structural invariant: both proxies live inside a full-bleed layer pinned to
 * `direction: 'ltr'`.
 */
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game/types';
import * as React from 'react';
import { StyleSheet } from 'react-native';

import { resolveBoardViewport } from '@/features/game/hooks/use-board-dimensions';
import { createInitialState } from '@/lib/game/constants';
import { cleanup, render, screen } from '@/lib/test-utils';

import { BoardView } from './board-view';

const MOVE_STUB = 'move-animation-overlay-stub';
const DRAG_STUB = 'drag-checker-overlay-stub';

jest.mock('./move-animation-overlay', () => ({
  MoveAnimationOverlay: () => {
    const { View: MockView } = jest.requireActual('react-native');
    return <MockView testID={MOVE_STUB} />;
  },
}));

jest.mock('./drag-checker-overlay', () => ({
  DragCheckerOverlay: () => {
    const { View: MockView } = jest.requireActual('react-native');
    return <MockView testID={DRAG_STUB} />;
  },
}));

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the real hook's export name
  useGamePreferences: () => ({
    preferences: { showPointNumbers: false, showMoveHints: false, showDirectionOverlay: false },
  }),
}));

function rtlDimensions(): BoardDimensions {
  return resolveBoardViewport({
    screenWidth: 402,
    screenHeight: 874,
    platform: 'native',
    slotWidth: 402,
    slotHeight: 340,
    rtl: true,
    showPointNumbers: false,
  });
}

function firstMovablePoint(state: GameState): number {
  const index = state.points.findIndex(p => p.count > 0 && p.player === state.currentPlayer);
  return index === -1 ? 1 : index + 1;
}

function renderBoard(dragFrom: number | null) {
  const state = createInitialState('vs-computer');
  const moveAnimation: MoveAnimationFrame = {
    from: 24,
    to: 18,
    player: state.currentPlayer,
    sourceStackCount: 1,
    sourceDisplayCount: 0,
    destStackCount: 1,
    onFinish: () => {},
  };

  return render(
    <BoardView
      state={state}
      dimensions={rtlDimensions()}
      previewTarget={null}
      moveAnimation={moveAnimation}
      dragFrom={dragFrom}
      onPointPress={() => {}}
      onPointPressIn={() => {}}
      onPointPressOut={() => {}}
      onBarPress={() => {}}
      onBearOffPress={() => {}}
      aidsOverride={{ showPointNumbers: false, showMoveHints: false, showDirectionOverlay: false }}
    />,
  );
}

type LayerHit = { node: ReturnType<typeof screen.getByTestId>; style: Record<string, unknown> };

/** The proxy host: the nearest ancestor View of a proxy that pins `direction`. */
function findProxyLayer(): LayerHit | null {
  const host = screen.queryAllByTestId(MOVE_STUB)[0];
  if (!host) {
    return null;
  }

  let layer = host.parent;
  while (layer) {
    const style = StyleSheet.flatten(layer.props.style) as Record<string, unknown> | undefined;
    if (style && style.direction !== undefined) {
      return { node: layer, style };
    }
    layer = layer.parent;
  }
  return null;
}

afterEach(cleanup);

describe('board view floating checker proxies in RTL', () => {
  it('uses RTL board dimensions for the mirrored layout', () => {
    expect(rtlDimensions().rtl).toBe(true);
  });

  it('hosts the move-slide proxy inside a layer pinned to ltr', () => {
    renderBoard(null);
    const layer = findProxyLayer();
    expect(layer).not.toBeNull();
    expect(layer?.style?.direction).toBe('ltr');
  });

  it('hosts the drag-ghost proxy inside the same ltr layer', () => {
    const state = createInitialState('vs-computer');
    renderBoard(firstMovablePoint(state));

    const layer = findProxyLayer();
    expect(layer).not.toBeNull();
    expect(layer?.style?.direction).toBe('ltr');

    // The drag ghost is a sibling of the slide inside that one layer.
    expect(screen.getByTestId(DRAG_STUB)).toBeDefined();
    expect(layer?.node.findAll(n => n.props?.testID === DRAG_STUB).length).toBeGreaterThan(0);
  });

  it('spans the full playing surface so board-space pixels are unshifted', () => {
    renderBoard(null);
    expect(findProxyLayer()?.style).toMatchObject({
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    });
  });

  it('never lets the proxy host intercept board touches', () => {
    renderBoard(null);
    expect(findProxyLayer()?.node.props.pointerEvents).toBe('none');
  });
});
