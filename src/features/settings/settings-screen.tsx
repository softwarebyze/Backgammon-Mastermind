import type { SettingsSearchId } from './settings-search';

import Env from 'env';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';

import {
  colors,
  FocusAwareStatusBar,
  ScrollView,
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
import { SETTINGS_MAX_WIDTH } from '@/lib/ui/game-chrome';
import { contentEdgePadding, useLayoutMetrics } from '@/lib/ui/layout-metrics';
import { WEB_SETTINGS_TOP_PADDING } from '@/lib/ui/web-layout';
import { GameSettingsSection } from './components/game-settings-section';
import { LanguageItem } from './components/language-item';
import { RestoreDefaultsItem } from './components/restore-defaults-item';
import { SettingsContainer } from './components/settings-container';
import { SettingsItem } from './components/settings-item';
import { SettingsNoResults } from './components/settings-no-results';
import { SettingsSearchField } from './components/settings-search-field';
import { DeveloperItem } from './developer-item';
import { isDeveloperToolsEnabled } from './developer-tools-gate';
import { getVisibleSettings } from './settings-search';

type VisibilityProps = {
  isVisible: (id: SettingsSearchId) => boolean;
};

type ExternalActionProps = {
  runExternalAction: (action: () => Promise<void>) => void;
};

type AnalyticsCapture = {
  capture: (event: string) => void;
};

function AboutSection({ isVisible, runExternalAction }: VisibilityProps & ExternalActionProps) {
  return (
    <SettingsContainer title="settings.about">
      {isVisible('version')
        ? (
            <SettingsItem
              text="settings.version"
              value={Env.EXPO_PUBLIC_VERSION}
            />
          )
        : null}
      {isVisible('openSource')
        ? (
            <SettingsItem
              text="settings.open_source"
              onPress={() => runExternalAction(() => openExternalUrl(APP_LINKS.openSource))}
            />
          )
        : null}
    </SettingsContainer>
  );
}

function SupportSection({
  isVisible,
  runExternalAction,
  posthog,
  iconColor,
}: VisibilityProps & ExternalActionProps & { posthog: AnalyticsCapture; iconColor: string }) {
  return (
    <SettingsContainer title="settings.support_us">
      {isVisible('share')
        ? (
            <SettingsItem
              text="settings.share"
              icon={<Share color={iconColor} />}
              onPress={() => {
                posthog.capture('app_share_initiated');
                runExternalAction(shareApp);
              }}
            />
          )
        : null}
      {isVisible('rate')
        ? (
            <SettingsItem
              text="settings.rate"
              icon={<Rate color={iconColor} />}
              onPress={() => {
                posthog.capture('rate_app_initiated');
                runExternalAction(openStoreListing);
              }}
            />
          )
        : null}
      {isVisible('support')
        ? (
            <SettingsItem
              text="settings.support"
              icon={<Support color={iconColor} />}
              onPress={() => {
                posthog.capture('support_opened');
                runExternalAction(() => openExternalUrl(APP_LINKS.support));
              }}
            />
          )
        : null}
    </SettingsContainer>
  );
}

function LinksSection({ isVisible, runExternalAction, iconColor }: VisibilityProps & ExternalActionProps & { iconColor: string }) {
  return (
    <SettingsContainer title="settings.links">
      {isVisible('privacy')
        ? (
            <SettingsItem
              text="settings.privacy"
              onPress={() => runExternalAction(() => openExternalUrl(APP_LINKS.privacy))}
            />
          )
        : null}
      {isVisible('terms')
        ? (
            <SettingsItem
              text="settings.terms"
              onPress={() => runExternalAction(() => openExternalUrl(APP_LINKS.terms))}
            />
          )
        : null}
      {isVisible('github')
        ? (
            <SettingsItem
              text="settings.github"
              icon={<Github color={iconColor} />}
              onPress={() => runExternalAction(() => openExternalUrl(APP_LINKS.github))}
            />
          )
        : null}
      {isVisible('website')
        ? (
            <SettingsItem
              text="settings.website"
              icon={<Website color={iconColor} />}
              onPress={() => runExternalAction(() => openExternalUrl(APP_LINKS.website))}
            />
          )
        : null}
    </SettingsContainer>
  );
}

function DeveloperSection({ isVisible }: VisibilityProps) {
  return (
    <SettingsContainer title="settings.developer">
      {isVisible('developerOpen') ? <DeveloperItem /> : null}
    </SettingsContainer>
  );
}

function ResetSection({ isVisible }: VisibilityProps) {
  return (
    <SettingsContainer title="settings.reset">
      {isVisible('restoreDefaults') ? <RestoreDefaultsItem /> : null}
    </SettingsContainer>
  );
}

export function SettingsScreen() {
  const posthog = usePostHog();
  const { insets } = useLayoutMetrics();
  const iconColor = colors.neutral[400];
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const developerToolsEnabled = isDeveloperToolsEnabled();

  const visibleSettings = useMemo(
    () => getVisibleSettings(query, { includeDeveloper: developerToolsEnabled }),
    [developerToolsEnabled, query],
  );
  const noResults = trimmedQuery.length > 0 && visibleSettings.size === 0;
  const isVisible = useCallback(
    (id: SettingsSearchId) => visibleSettings.has(id),
    [visibleSettings],
  );
  const clearSearch = useCallback(() => setQuery(''), []);

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
          <SettingsSearchField
            value={query}
            onChangeText={setQuery}
            onClear={clearSearch}
          />

          {noResults
            ? <SettingsNoResults query={trimmedQuery} onClear={clearSearch} />
            : (
                <>
                  <SettingsContainer title="settings.general">
                    {isVisible('language') ? <LanguageItem /> : null}
                  </SettingsContainer>

                  <GameSettingsSection showHints isVisibleSetting={isVisible} />

                  <AboutSection isVisible={isVisible} runExternalAction={runExternalAction} />

                  <SupportSection
                    isVisible={isVisible}
                    runExternalAction={runExternalAction}
                    posthog={posthog}
                    iconColor={iconColor}
                  />

                  <LinksSection
                    isVisible={isVisible}
                    runExternalAction={runExternalAction}
                    iconColor={iconColor}
                  />

                  {developerToolsEnabled ? <DeveloperSection isVisible={isVisible} /> : null}

                  <ResetSection isVisible={isVisible} />
                </>
              )}
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
