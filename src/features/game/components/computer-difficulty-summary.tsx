import { StyleSheet, Text } from 'react-native';
import { useComputerEngineFallback } from '@/features/game/computer-engine-status';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { translate } from '@/lib/i18n';

export function ComputerDifficultySummary({ inGame = false }: { inGame?: boolean }) {
  const { preferences } = useGamePreferences();
  const fallback = useComputerEngineFallback();
  const level = preferences.computerLevel;
  return (
    <Text testID="computer-difficulty-summary" style={styles.text}>
      {translate('game.difficulty.opponent', { level: translate(`game.difficulty.${level}`) })}
      {' · '}
      {inGame && level !== 'classic' && fallback
        ? translate('game.difficulty.fallback')
        : translate(`game.difficulty.${level}_description`)}
    </Text>
  );
}
const styles = StyleSheet.create({ text: { color: GAME_PALETTE.textMuted, fontSize: 12, lineHeight: 17 } });
