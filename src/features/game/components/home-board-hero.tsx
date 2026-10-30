import { useMemo } from 'react';
import { View } from 'react-native';
import { boardDiceSide, boardDieGap, boardDieSize, boardHalfFrame } from '@/features/game/components/board/board-dice-layout';
import { BoardView } from '@/features/game/components/board/board-view';
import { DieFace } from '@/features/game/components/board/dice-display';
import { playingSurfaceOffset } from '@/features/game/components/board/playing-surface-offset';
import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { createInitialState } from '@/lib/game';

function noop() {}
/** The classic opening 3-1, drawn where White would roll it. */
const OPENING_ROLL = [3, 1] as const;

/**
 * Home's centrepiece: the real board at the opening position, with White's
 * first roll on it. A picture, not a control: it takes no touches and is
 * hidden from screen readers.
 */
export function HomeBoardHero({ maxWidth, maxHeight }: { maxWidth: number; maxHeight: number }) {
  const dims = useMemo(() => fitBoardToViewport(maxWidth, maxHeight, { checkerCap: 64 }), [maxWidth, maxHeight]);
  const state = useMemo(() => ({ ...createInitialState('vs-human'), currentPlayer: 'white' as const, selectedPoint: null }), []);
  const size = boardDieSize(dims.checkerSize, 6 * dims.colWidth);
  const half = boardHalfFrame(dims, boardDiceSide('white'));
  const surface = playingSurfaceOffset(dims.boardFrameWidth, false);
  return (
    <View
      testID="home-board-hero"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: dims.boardOuterWidth, alignSelf: 'center' }}
    >
      <BoardView
        state={state}
        dimensions={dims}
        previewTarget={null}
        moveAnimation={null}
        interactionEnabled={false}
        onPointPress={noop}
        onPointPressIn={noop}
        onPointPressOut={noop}
        onBarPress={noop}
        onBearOffPress={noop}
        aidsOverride={{ showPointNumbers: false, showMoveHints: false, showDirectionOverlay: false }}
      />
      <View style={{ position: 'absolute', left: surface.left + half.left, top: surface.top, width: half.width, height: dims.boardHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: boardDieGap(size) }}>
        {OPENING_ROLL.map(value => <DieFace key={value} value={value} used={false} playerColor="white" displayStyle="dots" size={size} />)}
      </View>
    </View>
  );
}
