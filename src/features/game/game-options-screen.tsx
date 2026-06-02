import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GamePreferencesPanel } from '@/features/game/components/game-preferences-panel';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { SETTINGS_ROW_PADDING_H } from '@/lib/ui/settings-layout';

export function GameOptionsScreen() {
  const insets = useSafeAreaInsets();
  const {
    preferences,
    setShowMoveHints,
    setShowDirectionOverlay,
    setDiceDisplayStyle,
  } = useGamePreferences();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: Math.max(insets.bottom, 20) + 8 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <GamePreferencesPanel
        preferences={preferences}
        onShowMoveHintsChange={setShowMoveHints}
        onShowDirectionOverlayChange={setShowDirectionOverlay}
        onDiceDisplayStyleChange={setDiceDisplayStyle}
        showHints
      />

      <Link href="/settings" asChild>
        <Pressable style={styles.fullSettings} accessibilityRole="link">
          <Text style={styles.fullSettingsText}>Language, theme & more</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.surface,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    paddingTop: 12,
    gap: 16,
  },
  fullSettings: {
    paddingVertical: SETTINGS_ROW_PADDING_H,
    alignItems: 'center',
  },
  fullSettingsText: {
    color: GAME_PALETTE.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
