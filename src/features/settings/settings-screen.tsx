import Env from 'env';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useUniwind } from 'uniwind';

import {
  colors,
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { Github, Rate, Share, Support, Website } from '@/components/ui/icons';
import {
  APP_LINKS,
  openExternalUrl,
  openStoreListing,
  shareApp,
} from '@/lib/app-links';
import { translate } from '@/lib/i18n';
import { GameSettingsSection } from './components/game-settings-section';
import { LanguageItem } from './components/language-item';
import { SettingsContainer } from './components/settings-container';
import { SettingsItem } from './components/settings-item';
import { ThemeItem } from './components/theme-item';

export function SettingsScreen() {
  const { theme } = useUniwind();
  const iconColor
    = theme === 'dark' ? colors.neutral[400] : colors.neutral[500];

  const runExternalAction = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    }
    catch {
      Alert.alert('Unable to open link', 'Please try again later.');
    }
  }, []);

  return (
    <>
      <FocusAwareStatusBar />

      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="flex-1 px-4 pt-16 pb-8">
          <Text className="text-xl font-bold">
            {translate('settings.title')}
          </Text>

          <GameSettingsSection />

          <SettingsContainer title="settings.generale">
            <LanguageItem />
            <ThemeItem />
          </SettingsContainer>

          <SettingsContainer title="settings.about">
            <SettingsItem
              text="settings.app_name"
              value={Env.EXPO_PUBLIC_NAME}
            />
            <SettingsItem
              text="settings.version"
              value={Env.EXPO_PUBLIC_VERSION}
            />
          </SettingsContainer>

          <SettingsContainer title="settings.support_us">
            <SettingsItem
              text="settings.share"
              icon={<Share color={iconColor} />}
              onPress={() => runExternalAction(shareApp)}
            />
            <SettingsItem
              text="settings.rate"
              icon={<Rate color={iconColor} />}
              onPress={() => runExternalAction(openStoreListing)}
            />
            <SettingsItem
              text="settings.support"
              icon={<Support color={iconColor} />}
              onPress={() => runExternalAction(() => openExternalUrl(APP_LINKS.support))}
            />
          </SettingsContainer>

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
        </View>
      </ScrollView>
    </>
  );
}
