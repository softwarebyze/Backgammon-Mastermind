import * as React from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { confirmAction } from '@/lib/confirm';

import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

import { SettingsItem } from './settings-item';

export function RestoreDefaultsItem() {
  const { resetPreferences } = useGamePreferences();
  const [announcement, setAnnouncement] = React.useState('');

  const handlePress = React.useCallback(() => {
    confirmAction({
      title: translate('settings.restore_defaults_title'),
      message: translate('settings.restore_defaults_message'),
      confirmLabel: translate('settings.restore_defaults_confirm'),
      cancelLabel: translate('settings.restore_defaults_cancel'),
      destructive: true,
      onConfirm: () => {
        resetPreferences();
        const message = translate('settings.restore_defaults_done');
        setAnnouncement(message);
        if (Platform.OS !== 'web') {
          AccessibilityInfo.announceForAccessibility(message);
        }
      },
    });
  }, [resetPreferences]);

  return (
    <>
      <SettingsItem
        text="settings.restore_defaults"
        hint="settings.restore_defaults_hint"
        onPress={handlePress}
        testID="settings-restore-defaults"
      />
      {announcement
        ? (
            <Text accessibilityLiveRegion="polite" testID="settings-restore-status" style={styles.status}>
              {announcement}
            </Text>
          )
        : null}
    </>
  );
}

const styles = StyleSheet.create({
  status: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: GAME_PALETTE.textMuted,
    fontSize: 14,
    ...interFont('regular'),
  },
});
