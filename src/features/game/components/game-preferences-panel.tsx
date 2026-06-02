import type { GamePreferences } from '@/lib/game-preferences/types';

import { StyleSheet, View } from 'react-native';
import { DiceStylePicker } from '@/features/game/components/settings-ui/dice-style-picker';
import { HorseshoeIcon } from '@/features/game/components/settings-ui/horseshoe-icon';
import { MoveHintIcon } from '@/features/game/components/settings-ui/move-hint-icon';
import { SettingToggleRow } from '@/features/game/components/settings-ui/setting-toggle-row';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { continuousRadius } from '@/lib/ui/native-styles';
import { SETTINGS_ROW_PADDING_H } from '@/lib/ui/settings-layout';

type Props = {
  preferences: GamePreferences;
  onShowMoveHintsChange: (value: boolean) => void;
  onShowDirectionOverlayChange: (value: boolean) => void;
  onDiceDisplayStyleChange: (style: GamePreferences['diceDisplayStyle']) => void;
  showHints?: boolean;
};

export function GamePreferencesPanel({
  preferences,
  onShowMoveHintsChange,
  onShowDirectionOverlayChange,
  onDiceDisplayStyleChange,
  showHints = false,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <SettingToggleRow
          icon={<MoveHintIcon size={32} />}
          label={translate('game.preferences.move_hints')}
          hint={showHints ? translate('game.preferences.move_hints_hint') : undefined}
          value={preferences.showMoveHints}
          onChange={onShowMoveHintsChange}
        />
        <View style={styles.divider} />
        <SettingToggleRow
          icon={(
            <HorseshoeIcon
              size={32}
              color={
                preferences.showDirectionOverlay
                  ? GAME_PALETTE.accent
                  : GAME_PALETTE.textMuted
              }
            />
          )}
          label={translate('game.preferences.direction_overlay')}
          hint={showHints ? translate('game.preferences.direction_overlay_hint') : undefined}
          value={preferences.showDirectionOverlay}
          onChange={onShowDirectionOverlayChange}
        />
      </View>

      <View style={styles.diceCard}>
        <DiceStylePicker
          value={preferences.diceDisplayStyle}
          onChange={onDiceDisplayStyleChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  card: {
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    paddingVertical: 4,
    ...continuousRadius(12),
  },
  diceCard: {
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    paddingVertical: SETTINGS_ROW_PADDING_H,
    ...continuousRadius(12),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: GAME_PALETTE.surfaceBorder,
  },
});
