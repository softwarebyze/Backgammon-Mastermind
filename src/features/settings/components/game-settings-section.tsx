import { usePostHog } from 'posthog-react-native';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { GamePreferencesPanel } from '@/features/game/components/game-preferences-panel';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { requestReplaceActiveGame } from '@/features/game/request-new-game';
import { getS1Variants } from '@/features/game/s1-prototype';
import { useGame } from '@/features/game/use-game';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { ensureGameSfxReady } from '@/lib/game-sfx/play-game-sfx';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';
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
    setTutorMode,
    setConfirmMove,
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
          if (value) {
            void ensureGameSfxReady();
          }
        }}
        onFastComputerChange={(value) => {
          trackPreference('fast_computer', value);
          setFastComputer(value);
        }}
        onTutorModeChange={(value) => {
          trackPreference('tutor_mode', value);
          setTutorMode(value);
        }}
        onConfirmMoveChange={(value) => {
          trackPreference('confirm_move', value);
          setConfirmMove(value);
        }}
        showHints={showHints}
      />
      <NewGameInSettings />
    </View>
  );
}

/**
 * S1-I prototype: with the slim header, New game leaves the header and lives
 * here, in the options sheet, because it is rare and destructive.
 */
function NewGameInSettings() {
  const posthog = usePostHog();
  const { state, resetGame } = useGame();
  if (getS1Variants().header !== 'slim' || !state)
    return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={translate('game.controls.start_new_game_a11y')}
      testID="settings-new-game"
      onPress={() => {
        requestReplaceActiveGame({
          source: 'reset',
          liveState: state,
          onReplace: () => {
            posthog.capture('game_reset', {
              mode: state.mode,
              was_game_over: state.phase === 'game-over',
              source: 'settings',
            });
            resetGame();
          },
        });
      }}
      style={({ pressed }) => [styles.newGame, pressed && styles.newGamePressed]}
    >
      <Text style={styles.newGameText}>{translate('game.controls.new_game_title')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SETTINGS_SECTION_GAP,
  },
  title: {
    color: GAME_PALETTE.text,
  },
  newGame: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 224, 208, 0.28)',
    ...continuousRadius(12),
  },
  newGamePressed: {
    opacity: 0.8,
  },
  newGameText: {
    color: GAME_PALETTE.accent,
    fontSize: 16,
    ...interFont('semibold'),
  },
});
