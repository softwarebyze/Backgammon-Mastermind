import { usePostHog } from 'posthog-react-native';
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
  const posthog = usePostHog();
  const {
    preferences,
    setShowMoveHints,
    setShowDirectionOverlay,
    setShowPointNumbers,
    setDiceDisplayStyle,
    setAutoRoll,
    setAutoMoveWhenForced,
    setSoundEnabled,
    setFastComputer,
  } = useGamePreferences();

  const trackPreference = React.useCallback(
    (preference: string, value: boolean | string) => {
      posthog.capture('game_preference_changed', { preference, value });
    },
    [posthog],
  );

  return (
    <View style={styles.section}>
      <Text className="pb-2 text-lg" style={styles.title} tx="settings.game" />
      <GamePreferencesPanel
        preferences={preferences}
        onShowMoveHintsChange={(value) => {
          trackPreference('move_hints', value);
          setShowMoveHints(value);
        }}
        onShowDirectionOverlayChange={(value) => {
          trackPreference('direction_overlay', value);
          setShowDirectionOverlay(value);
        }}
        onShowPointNumbersChange={(value) => {
          trackPreference('point_numbers', value);
          setShowPointNumbers(value);
        }}
        onDiceDisplayStyleChange={(value) => {
          trackPreference('dice_display_style', value);
          setDiceDisplayStyle(value);
        }}
        onAutoRollChange={(value) => {
          trackPreference('auto_roll', value);
          setAutoRoll(value);
        }}
        onAutoMoveWhenForcedChange={(value) => {
          trackPreference('auto_move', value);
          setAutoMoveWhenForced(value);
        }}
        onSoundEnabledChange={(value) => {
          trackPreference('sound', value);
          setSoundEnabled(value);
        }}
        onFastComputerChange={(value) => {
          trackPreference('fast_computer', value);
          setFastComputer(value);
        }}
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
