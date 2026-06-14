import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { DiceStylePicker } from '@/features/game/components/settings-ui/dice-style-picker';
import { HorseshoeIcon } from '@/features/game/components/settings-ui/horseshoe-icon';
import { MoveHintIcon } from '@/features/game/components/settings-ui/move-hint-icon';
import { SettingToggleRow } from '@/features/game/components/settings-ui/setting-toggle-row';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { translate } from '@/lib/i18n';
import { SETTINGS_ROW_PADDING_H } from '@/lib/ui/settings-layout';

import { SettingsContainer } from './settings-container';

export function GameSettingsSection() {
  const {
    preferences,
    setShowMoveHints,
    setShowDirectionOverlay,
    setDiceDisplayStyle,
  } = useGamePreferences();

  return (
    <>
      <SettingsContainer title="settings.game">
        <SettingToggleRow
          icon={<MoveHintIcon size={32} />}
          label={translate('game.preferences.move_hints')}
          value={preferences.showMoveHints}
          onChange={setShowMoveHints}
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
          value={preferences.showDirectionOverlay}
          onChange={setShowDirectionOverlay}
        />
      </SettingsContainer>

      <SettingsContainer>
        <View style={styles.diceWrap}>
          <DiceStylePicker
            value={preferences.diceDisplayStyle}
            onChange={setDiceDisplayStyle}
          />
        </View>
      </SettingsContainer>
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: GAME_PALETTE.surfaceBorder,
    marginHorizontal: SETTINGS_ROW_PADDING_H,
  },
  diceWrap: {
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    paddingVertical: SETTINGS_ROW_PADDING_H,
  },
});
