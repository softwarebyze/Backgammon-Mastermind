import type { StrategyKey } from '@/features/game/strategy';
import { Text } from '@/components/ui/scaled-text';
import { FONT_SCALE_CAP } from '@/lib/ui/font-scale';

/** Every plan has its own emoji; the opening gets the dice, since nothing has taken shape. */
const STRATEGY_EMOJI: Record<StrategyKey, string> = {
  developing: '🎲',
  running: '🏃',
  blitz: '⚔️',
  priming: '🧱',
  holding: '⚓',
  backgame: '🕸️',
};

export function StrategyMark({
  strategy,
  size,
}: {
  strategy: StrategyKey;
  size: number;
}) {
  return (
    <Text maxFontSizeMultiplier={FONT_SCALE_CAP.fixed} style={{ fontSize: size * 0.85, lineHeight: size, width: size, textAlign: 'center' }}>
      {STRATEGY_EMOJI[strategy]}
    </Text>
  );
}
