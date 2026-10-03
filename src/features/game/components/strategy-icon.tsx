import type { StrategyKey } from '@/features/game/strategy';
import { Text, View } from 'react-native';

/** Glanceable color for the developing dot. The five plans use emoji. */
const DEVELOPING_COLOR = '#8A8A92';

const STRATEGY_EMOJI: Record<Exclude<StrategyKey, 'developing'>, string> = {
  running: '🏃',
  blitz: '⚔️',
  priming: '🧱',
  holding: '⚓',
  backgame: '🕸️',
};

/** Emoji for the five contact plans. Developing stays a quiet dot. */
export function StrategyMark({
  strategy,
  size,
}: {
  strategy: StrategyKey;
  size: number;
}) {
  if (strategy === 'developing') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: size * 0.45,
            height: size * 0.45,
            borderRadius: size,
            backgroundColor: DEVELOPING_COLOR,
          }}
        />
      </View>
    );
  }
  return (
    <Text style={{ fontSize: size * 0.85, lineHeight: size, width: size, textAlign: 'center' }}>
      {STRATEGY_EMOJI[strategy]}
    </Text>
  );
}
