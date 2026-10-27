import type { SettingsSearchId } from '@/features/settings/settings-search';

import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { GamePreferencesPanel } from '@/features/game/components/game-preferences-panel';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { GAME_SETTING_SEARCH_IDS } from '@/features/settings/settings-search';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { ensureGameSfxReady } from '@/lib/game-sfx/play-game-sfx';
import { SETTINGS_SECTION_GAP } from '@/lib/ui/settings-layout';

type Props = {
  showHints?: boolean;
  isVisibleSetting?: (id: SettingsSearchId) => boolean;
};

export function GameSettingsSection({ showHints = false, isVisibleSetting }: Props) {
  const {
    preferences,
    setShowMoveHints,
    setShowDirectionOverlay,
    setShowPointNumbers,
    setDiceDisplayStyle,
    setAutoRoll,
    setAutoMoveWhenForced,
    setSoundEnabled,
    setTutorMode,
    setConfirmMove,
  } = useGamePreferences();

  if (
    isVisibleSetting
    && !GAME_SETTING_SEARCH_IDS.some(id => isVisibleSetting(id))
  ) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text className="pb-2 text-lg" style={styles.title} tx="settings.game" />
      <GamePreferencesPanel
        preferences={preferences}
        onShowMoveHintsChange={setShowMoveHints}
        onShowDirectionOverlayChange={setShowDirectionOverlay}
        onShowPointNumbersChange={setShowPointNumbers}
        onDiceDisplayStyleChange={setDiceDisplayStyle}
        onAutoRollChange={setAutoRoll}
        onAutoMoveWhenForcedChange={setAutoMoveWhenForced}
        onSoundEnabledChange={(value) => {
          setSoundEnabled(value);
          if (value) {
            void ensureGameSfxReady();
          }
        }}
        onTutorModeChange={setTutorMode}
        onConfirmMoveChange={setConfirmMove}
        showHints={showHints}
        isVisible={isVisibleSetting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SETTINGS_SECTION_GAP,
  },
  title: {
    color: GAME_PALETTE.text,
  },
});
