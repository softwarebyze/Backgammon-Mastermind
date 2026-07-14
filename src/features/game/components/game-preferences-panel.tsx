import type { GamePreferences } from '@/lib/game-preferences/types';

import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { AutoMoveIcon } from '@/features/game/components/settings-ui/auto-move-icon';
import { AutoRollIcon } from '@/features/game/components/settings-ui/auto-roll-icon';
import { DiceStylePicker } from '@/features/game/components/settings-ui/dice-style-picker';
import { HorseshoeIcon } from '@/features/game/components/settings-ui/horseshoe-icon';
import { MoveHintIcon } from '@/features/game/components/settings-ui/move-hint-icon';
import { PointNumbersIcon } from '@/features/game/components/settings-ui/point-numbers-icon';
import { SettingToggleRow } from '@/features/game/components/settings-ui/setting-toggle-row';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { continuousRadius } from '@/lib/ui/native-styles';
import { SETTINGS_ROW_PADDING_H } from '@/lib/ui/settings-layout';

type Props = {
  preferences: GamePreferences;
  onShowMoveHintsChange: (value: boolean) => void;
  onShowDirectionOverlayChange: (value: boolean) => void;
  onShowPointNumbersChange: (value: boolean) => void;
  onDiceDisplayStyleChange: (style: GamePreferences['diceDisplayStyle']) => void;
  onAutoRollChange: (value: boolean) => void;
  onAutoMoveWhenForcedChange: (value: boolean) => void;
  onSoundEnabledChange: (value: boolean) => void;
  showHints?: boolean;
};

export function GamePreferencesPanel({
  preferences,
  onShowMoveHintsChange,
  onShowDirectionOverlayChange,
  onShowPointNumbersChange,
  onDiceDisplayStyleChange,
  onAutoRollChange,
  onAutoMoveWhenForcedChange,
  onSoundEnabledChange,
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
          icon={<HorseshoeIcon size={32} />}
          label={translate('game.preferences.direction_overlay')}
          hint={showHints ? translate('game.preferences.direction_overlay_hint') : undefined}
          value={preferences.showDirectionOverlay}
          onChange={onShowDirectionOverlayChange}
        />
        <View style={styles.divider} />
        <SettingToggleRow
          icon={<PointNumbersIcon size={32} />}
          label={translate('game.preferences.point_numbers')}
          hint={showHints ? translate('game.preferences.point_numbers_hint') : undefined}
          value={preferences.showPointNumbers}
          onChange={onShowPointNumbersChange}
        />
      </View>

      <View style={styles.card}>
        <SettingToggleRow
          icon={<AutoRollIcon size={32} />}
          label={translate('game.preferences.auto_roll')}
          hint={showHints ? translate('game.preferences.auto_roll_hint') : undefined}
          value={preferences.autoRoll}
          onChange={onAutoRollChange}
        />
        <View style={styles.divider} />
        <SettingToggleRow
          icon={<AutoMoveIcon size={32} />}
          label={translate('game.preferences.auto_move')}
          hint={showHints ? translate('game.preferences.auto_move_hint') : undefined}
          value={preferences.autoMoveWhenForced}
          onChange={onAutoMoveWhenForcedChange}
        />
        <View style={styles.divider} />
        <SettingToggleRow
          icon={(
            <View style={styles.soundIcon}>
              <Feather name="volume-2" size={22} color={GAME_PALETTE.accent} />
            </View>
          )}
          label={translate('game.preferences.sound')}
          hint={showHints ? translate('game.preferences.sound_hint') : undefined}
          value={preferences.soundEnabled}
          onChange={onSoundEnabledChange}
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
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    paddingVertical: SETTINGS_ROW_PADDING_H,
    ...continuousRadius(12),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: GAME_PALETTE.surfaceBorder,
  },
  soundIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
