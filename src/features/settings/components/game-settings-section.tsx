import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { GamePreferencesPanel } from '@/features/game/components/game-preferences-panel';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { SETTINGS_SECTION_GAP } from '@/lib/ui/settings-layout';

type Props = {
  showHints?: boolean;
};

export function GameSettingsSection({ showHints = false }: Props) {
  const {
    preferences,
    setShowMoveHints,
    setShowDirectionOverlay,
    setShowPointNumbers,
    setDiceDisplayStyle,
    setAutoRoll,
    setAutoMoveWhenForced,
  } = useGamePreferences();

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
        showHints={showHints}
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
