import type { GamePreferences } from '@/lib/game-preferences/types';

import { StyleSheet, View } from 'react-native';
import { AutoMoveIcon } from '@/features/game/components/settings-ui/auto-move-icon';
import { AutoRollIcon } from '@/features/game/components/settings-ui/auto-roll-icon';
import { DiceStylePicker } from '@/features/game/components/settings-ui/dice-style-picker';
import { FastComputerIcon } from '@/features/game/components/settings-ui/fast-computer-icon';
import { HorseshoeIcon } from '@/features/game/components/settings-ui/horseshoe-icon';
import { MoveHintIcon } from '@/features/game/components/settings-ui/move-hint-icon';
import { PointNumbersIcon } from '@/features/game/components/settings-ui/point-numbers-icon';
import { SettingToggleRow } from '@/features/game/components/settings-ui/setting-toggle-row';
import { SoundIcon } from '@/features/game/components/settings-ui/sound-icon';
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
  onFastComputerChange: (value: boolean) => void;
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
  onFastComputerChange,
  showHints = false,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <SettingToggleRow
          icon={<MoveHintIcon size={32} active={preferences.showMoveHints} />}
          label={translate('game.preferences.move_hints')}
          hint={showHints ? translate('game.preferences.move_hints_hint') : undefined}
          value={preferences.showMoveHints}
          onChange={onShowMoveHintsChange}
        />
        <View style={styles.divider} />
        <SettingToggleRow
          icon={<HorseshoeIcon size={32} active={preferences.showDirectionOverlay} />}
          label={translate('game.preferences.direction_overlay')}
          hint={showHints ? translate('game.preferences.direction_overlay_hint') : undefined}
          value={preferences.showDirectionOverlay}
          onChange={onShowDirectionOverlayChange}
        />
        <View style={styles.divider} />
        <SettingToggleRow
          icon={<PointNumbersIcon size={32} active={preferences.showPointNumbers} />}
          label={translate('game.preferences.point_numbers')}
          hint={showHints ? translate('game.preferences.point_numbers_hint') : undefined}
          value={preferences.showPointNumbers}
          onChange={onShowPointNumbersChange}
        />
      </View>

      <View style={styles.card}>
        <SettingToggleRow
          icon={<AutoRollIcon size={42} active={preferences.autoRoll} />}
          label={translate('game.preferences.auto_roll')}
          hint={showHints ? translate('game.preferences.auto_roll_hint') : undefined}
          value={preferences.autoRoll}
          onChange={onAutoRollChange}
        />
        <View style={styles.divider} />
        <SettingToggleRow
          icon={<AutoMoveIcon size={42} active={preferences.autoMoveWhenForced} />}
          label={translate('game.preferences.auto_move')}
          hint={showHints ? translate('game.preferences.auto_move_hint') : undefined}
          value={preferences.autoMoveWhenForced}
          onChange={onAutoMoveWhenForcedChange}
        />
        <View style={styles.divider} />
        <SettingToggleRow
          icon={<SoundIcon size={32} active={preferences.soundEnabled} />}
          label={translate('game.preferences.sound')}
          hint={showHints ? translate('game.preferences.sound_hint') : undefined}
          value={preferences.soundEnabled}
          onChange={onSoundEnabledChange}
          testID="setting-toggle-sound"
        />
        <View style={styles.divider} />
        <SettingToggleRow
          icon={<FastComputerIcon size={32} active={preferences.fastComputer} />}
          label={translate('game.preferences.fast_computer')}
          hint={showHints ? translate('game.preferences.fast_computer_hint') : undefined}
          value={preferences.fastComputer}
          onChange={onFastComputerChange}
          testID="setting-toggle-fast-computer"
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
    paddingVertical: 4,
    overflow: 'hidden',
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
});
