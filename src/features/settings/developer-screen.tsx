import type { GameState } from '@/lib/game';
import { Redirect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput } from 'react-native';

import {
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { showErrorMessage } from '@/components/ui/utils';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGame } from '@/features/game/use-game';
import { SettingsChevron } from '@/features/settings/components/settings-chevron';
import { SettingsContainer } from '@/features/settings/components/settings-container';
import { isDeveloperToolsEnabled } from '@/features/settings/developer-tools-gate';
import {
  loadPositionPreset,
  parsePositionJson,
  POSITION_JSON_EXAMPLE,
  POSITION_LOADER_PRESETS,
} from '@/lib/game/load-position';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';
import {
  SETTINGS_ROW_MIN_HEIGHT,
  SETTINGS_ROW_PADDING_H,
  SETTINGS_ROW_PADDING_V,
} from '@/lib/ui/settings-layout';
import { WEB_SETTINGS_TOP_PADDING } from '@/lib/ui/web-layout';

function useStartLoadedPosition() {
  const { startFromPosition } = useGame();
  return useCallback((state: GameState) => {
    hapticLight();
    startFromPosition(state);
    router.replace('/game');
  }, [startFromPosition]);
}

export function DeveloperScreen() {
  const startLoaded = useStartLoadedPosition();

  if (!isDeveloperToolsEnabled()) {
    return <Redirect href="/settings" />;
  }

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          Platform.OS === 'web' ? { paddingTop: WEB_SETTINGS_TOP_PADDING } : undefined
        }
      >
        <View className="flex-1 px-4 pb-8">
          <Text className="pb-4 text-sm" style={styles.blurb} tx="settings.developer_blurb" />
          <PresetSection onLoad={startLoaded} />
          <JsonSection onLoad={startLoaded} />
        </View>
      </ScrollView>
    </>
  );
}

function PresetSection({ onLoad }: { onLoad: (state: GameState) => void }) {
  return (
    <SettingsContainer title="settings.developer_presets">
      {POSITION_LOADER_PRESETS.map(preset => (
        <Pressable
          key={preset.id}
          accessibilityRole="button"
          accessibilityLabel={preset.label}
          testID={`developer-preset-${preset.id}`}
          style={styles.presetRow}
          onPress={() => onLoad(loadPositionPreset(preset))}
        >
          <View style={styles.presetCopy}>
            <Text style={styles.presetLabel}>{preset.label}</Text>
            <Text style={styles.presetHint}>{preset.description}</Text>
          </View>
          <SettingsChevron />
        </Pressable>
      ))}
    </SettingsContainer>
  );
}

function JsonSection({ onLoad }: { onLoad: (state: GameState) => void }) {
  const [json, setJson] = useState(POSITION_JSON_EXAMPLE);

  const handleLoad = useCallback(() => {
    const result = parsePositionJson(json);
    if (!result.ok) {
      showErrorMessage(result.error);
      return;
    }
    onLoad(result.state);
  }, [json, onLoad]);

  return (
    <View style={styles.jsonBlock}>
      <Text className="pb-2 text-lg" style={styles.sectionTitle} tx="settings.developer_json" />
      <TextInput
        testID="developer-json-input"
        value={json}
        onChangeText={setJson}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        placeholder={POSITION_JSON_EXAMPLE}
        placeholderTextColor={GAME_PALETTE.textMuted}
        style={styles.jsonInput}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('settings.developer_load')}
        testID="developer-load-json"
        style={({ pressed }) => [styles.loadBtn, pressed && styles.pressed]}
        onPress={handleLoad}
      >
        <Text style={styles.loadLabel}>{translate('settings.developer_load')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  blurb: {
    color: GAME_PALETTE.textMuted,
  },
  sectionTitle: {
    color: GAME_PALETTE.text,
  },
  presetRow: {
    minHeight: SETTINGS_ROW_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SETTINGS_ROW_PADDING_H,
    paddingVertical: SETTINGS_ROW_PADDING_V,
  },
  presetCopy: {
    flex: 1,
    paddingRight: 8,
  },
  presetLabel: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    ...interFont('regular'),
  },
  presetHint: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    marginTop: 2,
    ...interFont('regular'),
  },
  jsonBlock: {
    marginBottom: 24,
  },
  jsonInput: {
    minHeight: 180,
    textAlignVertical: 'top',
    padding: 12,
    color: GAME_PALETTE.text,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    fontSize: 13,
    fontFamily: Platform.OS === 'web'
      ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
      : 'monospace',
    ...continuousRadius(12),
  },
  loadBtn: {
    marginTop: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    ...continuousRadius(12),
  },
  loadLabel: {
    color: GAME_PALETTE.accent,
    fontSize: 16,
    ...interFont('bold'),
  },
  pressed: {
    opacity: 0.88,
  },
});
