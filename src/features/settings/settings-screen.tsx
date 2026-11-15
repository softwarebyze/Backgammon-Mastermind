import Env from 'env';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';

import {
  colors,
  FocusAwareStatusBar,
  ScrollView,
  View,
} from '@/components/ui';
import { Github, Website } from '@/components/ui/icons';
import { GetAppSettingsSection } from '@/features/get-app/get-app-settings-section';
import {
  APP_LINKS,
  openExternalUrl,
} from '@/lib/app-links';
import { translate } from '@/lib/i18n';
import { SETTINGS_MAX_WIDTH } from '@/lib/ui/game-chrome';
import { contentEdgePadding, useLayoutMetrics } from '@/lib/ui/layout-metrics';
import { WEB_SETTINGS_TOP_PADDING } from '@/lib/ui/web-layout';
import { GameSettingsSection } from './components/game-settings-section';
import { LanguageItem } from './components/language-item';
import { SettingsContainer } from './components/settings-container';
import { SettingsItem } from './components/settings-item';
import { SettingsSupportSection } from './components/settings-support-section';
import { DeveloperItem } from './developer-item';
import { isDeveloperToolsEnabled } from './developer-tools-gate';

/** Present app preferences and links to standalone tools using the current language and platform layout. */
export function SettingsScreen() {
  const { insets } = useLayoutMetrics();
  const iconColor = colors.neutral[400];

  const runExternalAction = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    }
    catch {
      Alert.alert(translate('settings.link_error_title'), translate('settings.link_error_body'));
    }
  }, []);

  return (
    <>
      <FocusAwareStatusBar />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          Platform.OS === 'web' ? { paddingTop: WEB_SETTINGS_TOP_PADDING } : undefined,
          contentEdgePadding(insets, { bottom: 32 }),
        ]}
      >
        <View className="px-4" style={styles.page}>
          {Platform.OS === 'web' ? <GetAppSettingsSection /> : null}

          <SettingsContainer title="settings.general">
            <LanguageItem />
            <SettingsItem text="positions.title" onPress={() => router.push('/position')} />
            <SettingsItem text="timer.title" testID="settings-timer" onPress={() => router.push('/timer')} />
          </SettingsContainer>

          <GameSettingsSection showHints />

          <SettingsContainer title="settings.about">
            <SettingsItem
              text="settings.version"
              value={Env.EXPO_PUBLIC_VERSION}
            />
            <SettingsItem
              text="settings.open_source"
              onPress={() => runExternalAction(() => openExternalUrl(APP_LINKS.openSource))}
            />
          </SettingsContainer>

          <SettingsSupportSection runExternalAction={runExternalAction} />

          <SettingsContainer title="settings.links">
            <SettingsItem
              text="settings.privacy"
              onPress={() => runExternalAction(() => openExternalUrl(APP_LINKS.privacy))}
            />
            <SettingsItem
              text="settings.terms"
              onPress={() => runExternalAction(() => openExternalUrl(APP_LINKS.terms))}
            />
            <SettingsItem
              text="settings.github"
              icon={<Github color={iconColor} />}
              onPress={() => runExternalAction(() => openExternalUrl(APP_LINKS.github))}
            />
            <SettingsItem
              text="settings.website"
              icon={<Website color={iconColor} />}
              onPress={() => runExternalAction(() => openExternalUrl(APP_LINKS.website))}
            />
          </SettingsContainer>

          {isDeveloperToolsEnabled()
            ? (
                <SettingsContainer title="settings.developer">
                  <DeveloperItem />
                </SettingsContainer>
              )
            : null}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: SETTINGS_MAX_WIDTH,
    alignSelf: 'center',
    paddingBottom: 8,
  },
});
