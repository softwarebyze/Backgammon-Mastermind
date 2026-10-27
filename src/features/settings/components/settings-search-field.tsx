import Feather from '@expo/vector-icons/Feather';
import * as React from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { getLayoutIsRTL, translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';
import { SETTINGS_SECTION_GAP } from '@/lib/ui/settings-layout';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
};

export function SettingsSearchField({ value, onChangeText, onClear }: Props) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <Feather name="search" size={18} color={GAME_PALETTE.textMuted} />
      <TextInput
        testID="settings-search-input"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyPress={(event) => {
          if (event.nativeEvent.key === 'Escape') {
            onClear();
          }
        }}
        onSubmitEditing={Keyboard.dismiss}
        placeholder={translate('settings.search')}
        placeholderTextColor={GAME_PALETTE.textMuted}
        accessibilityLabel={translate('settings.search')}
        accessibilityHint={translate('settings.search_hint')}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="search"
        enterKeyHint="search"
        clearButtonMode="never"
        selectionColor={GAME_PALETTE.accent}
        underlineColorAndroid="transparent"
        style={styles.input}
      />
      {value.length > 0
        ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translate('settings.search_clear')}
              testID="settings-search-clear"
              hitSlop={8}
              onPress={onClear}
              style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
            >
              <Feather name="x" size={18} color={GAME_PALETTE.textMuted} />
            </Pressable>
          )
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingStart: 12,
    paddingEnd: 4,
    marginBottom: SETTINGS_SECTION_GAP,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(12),
  },
  wrapFocused: {
    borderColor: GAME_PALETTE.accent,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    color: GAME_PALETTE.text,
    fontSize: 16,
    textAlign: getLayoutIsRTL() ? 'right' : 'left',
    ...interFont('regular'),
  },
  clear: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
