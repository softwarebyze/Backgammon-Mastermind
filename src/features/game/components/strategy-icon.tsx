import type { StrategyKey } from '@/features/game/strategy';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';

/** Glanceable color kept so the shape is not the only signal. */
const STRATEGY_COLOR: Record<StrategyKey, string> = {
  running: '#7BC98B',
  blitz: '#E08A6D',
  priming: '#8FA8D8',
  holding: '#D8C88F',
  backgame: '#C98F7B',
  developing: '#8A8A92',
};

const STRATEGY_EMOJI: Record<Exclude<StrategyKey, 'developing'>, string> = {
  running: '🏃',
  blitz: '⚔️',
  priming: '🧱',
  holding: '⚓',
  backgame: '🕸️',
};

const STRATEGY_COMPARE_KEYS = ['running', 'blitz', 'priming', 'holding', 'backgame'] as const;

export type StrategyMarkKind = 'icon' | 'emoji';

function stroke(color: string) {
  return {
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
}

function RunningIcon({ color }: { color: string }) {
  const pen = stroke(color);
  return (
    <>
      <Circle cx="15" cy="4.2" r="1.8" fill={color} stroke="none" />
      <Line x1="14" y1="6.4" x2="10.2" y2="13" {...pen} />
      <Line x1="12.4" y1="8.6" x2="6.5" y2="11" {...pen} />
      <Line x1="12.4" y1="8.6" x2="18.2" y2="11.2" {...pen} />
      <Line x1="10.2" y1="13" x2="5.6" y2="20.2" {...pen} />
      <Line x1="10.2" y1="13" x2="16.8" y2="20.2" {...pen} />
    </>
  );
}

function BlitzIcon({ color }: { color: string }) {
  const pen = stroke(color);
  return (
    <>
      <Line x1="9.2" y1="14.8" x2="19.2" y2="4.8" {...pen} />
      <Line x1="6.2" y1="11.8" x2="12.2" y2="17.8" {...pen} />
      <Line x1="9.2" y1="14.8" x2="4.6" y2="19.4" {...pen} />
      <Line x1="9.2" y1="9.2" x2="19.2" y2="19.2" {...pen} />
      <Line x1="6.2" y1="12.2" x2="12.2" y2="6.2" {...pen} />
      <Line x1="9.2" y1="9.2" x2="4.6" y2="4.6" {...pen} />
    </>
  );
}

function PrimingIcon({ color }: { color: string }) {
  const pen = stroke(color);
  return (
    <>
      <Rect x="3" y="4" width="18" height="16" rx="1.2" {...pen} />
      <Line x1="3" y1="9.3" x2="21" y2="9.3" {...pen} />
      <Line x1="3" y1="14.7" x2="21" y2="14.7" {...pen} />
      <Line x1="12" y1="4" x2="12" y2="9.3" {...pen} />
      <Line x1="8" y1="9.3" x2="8" y2="14.7" {...pen} />
      <Line x1="16" y1="9.3" x2="16" y2="14.7" {...pen} />
      <Line x1="12" y1="14.7" x2="12" y2="20" {...pen} />
    </>
  );
}

function HoldingIcon({ color }: { color: string }) {
  const pen = stroke(color);
  return (
    <>
      <Circle cx="12" cy="5" r="2" {...pen} />
      <Line x1="12" y1="7" x2="12" y2="17" {...pen} />
      <Line x1="7.5" y1="10" x2="16.5" y2="10" {...pen} />
      <Path d="M12 17 C12 21.5 5 20 6.2 14.5" {...pen} />
      <Path d="M12 17 C12 21.5 19 20 17.8 14.5" {...pen} />
    </>
  );
}

function BackGameIcon({ color }: { color: string }) {
  const pen = stroke(color);
  return (
    <>
      <Circle cx="12" cy="12" r="8" {...pen} />
      <Circle cx="12" cy="12" r="3.6" {...pen} />
      <Line x1="12" y1="4" x2="12" y2="20" {...pen} />
      <Line x1="4" y1="12" x2="20" y2="12" {...pen} />
      <Line x1="6.3" y1="6.3" x2="17.7" y2="17.7" {...pen} />
      <Line x1="17.7" y1="6.3" x2="6.3" y2="17.7" {...pen} />
    </>
  );
}

const ICONS = {
  running: RunningIcon,
  blitz: BlitzIcon,
  priming: PrimingIcon,
  holding: HoldingIcon,
  backgame: BackGameIcon,
} as const;

/** Shape for the five contact plans. Developing stays a quiet dot. */
export function StrategyMark({
  strategy,
  kind,
  size,
}: {
  strategy: StrategyKey;
  kind: StrategyMarkKind;
  size: number;
}) {
  const color = STRATEGY_COLOR[strategy];
  if (strategy === 'developing') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size, backgroundColor: color }} />
      </View>
    );
  }
  if (kind === 'emoji') {
    return (
      <Text style={{ fontSize: size * 0.85, lineHeight: size, width: size, textAlign: 'center' }}>
        {STRATEGY_EMOJI[strategy]}
      </Text>
    );
  }
  const Icon = ICONS[strategy];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Icon color={color} />
    </Svg>
  );
}

/** Side-by-side set so the status line can be flipped between the two marks. */
export function StrategyMarkCompare({
  kind,
  onPick,
}: {
  kind: StrategyMarkKind;
  onPick: (kind: StrategyMarkKind) => void;
}) {
  return (
    <View style={styles.compare} testID="strategy-compare">
      <CompareRow kind="icon" selected={kind === 'icon'} onPick={onPick} />
      <CompareRow kind="emoji" selected={kind === 'emoji'} onPick={onPick} />
    </View>
  );
}

function CompareRow({
  kind,
  selected,
  onPick,
}: {
  kind: StrategyMarkKind;
  selected: boolean;
  onPick: (kind: StrategyMarkKind) => void;
}) {
  return (
    <Pressable
      onPress={() => onPick(kind)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={`strategy-compare-${kind}`}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <Text style={styles.rowLabel}>{kind === 'icon' ? 'Icons' : 'Emoji'}</Text>
      <View style={styles.marks}>
        {STRATEGY_COMPARE_KEYS.map(key => (
          <StrategyMark key={key} strategy={key} kind={kind} size={22} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compare: {
    gap: 6,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
  },
  rowSelected: {
    borderColor: GAME_PALETTE.accentDim,
    backgroundColor: 'rgba(255, 196, 153, 0.08)',
  },
  rowLabel: {
    width: 44,
    color: GAME_PALETTE.textMuted,
    fontSize: 11,
    ...interFont('medium'),
  },
  marks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
