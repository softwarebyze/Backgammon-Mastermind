import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GamePreferencesPanel } from '@/features/game/components/game-preferences-panel';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { SETTINGS_SECTION_GAP } from '@/lib/ui/settings-layout';

export function GameSettingsSection() {
  const {
    preferences,
    setShowMoveHints,
    setShowDirectionOverlay,
    setDiceDisplayStyle,
  } = useGamePreferences();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Game</Text>
      <GamePreferencesPanel
        preferences={preferences}
        onShowMoveHintsChange={setShowMoveHints}
        onShowDirectionOverlayChange={setShowDirectionOverlay}
        onDiceDisplayStyleChange={setDiceDisplayStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SETTINGS_SECTION_GAP,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: GAME_PALETTE.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
