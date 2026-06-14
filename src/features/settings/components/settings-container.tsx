import type { TxKeyPath } from '@/lib/i18n';

import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { continuousRadius } from '@/lib/ui/native-styles';
import { SETTINGS_SECTION_GAP } from '@/lib/ui/settings-layout';

type Props = {
  children: React.ReactNode;
  title?: TxKeyPath;
};

export function SettingsContainer({ children, title }: Props) {
  return (
    <View style={styles.section}>
      {title ? <Text className="pb-2 text-lg" style={styles.title} tx={title} /> : null}
      <View style={styles.card}>{children}</View>
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
  card: {
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    paddingVertical: 4,
    ...continuousRadius(12),
  },
});
