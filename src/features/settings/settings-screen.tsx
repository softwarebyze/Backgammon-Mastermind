import type { ReactNode } from 'react';
import Env from 'env';
import { StyleSheet } from 'react-native';

import { FocusAwareStatusBar, ScrollView, Text, View } from '@/components/ui';
import { Github, Rate, Share, Support, Website } from '@/components/ui/icons';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import {
  openGithub,
  openPrivacy,
  openSupport,
  openTerms,
  openWebsite,
  rateApp,
  shareApp,
} from '@/lib/settings/settings-actions';
import { continuousRadius } from '@/lib/ui/native-styles';
import { GameSettingsSection } from './components/game-settings-section';
import { LanguageItem } from './components/language-item';
import { SettingsItem } from './components/settings-item';
import { ThemeItem } from './components/theme-item';

export function SettingsScreen() {
  const iconColor = GAME_PALETTE.textMuted;

  return (
    <View style={styles.root}>
      <FocusAwareStatusBar />
      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
      >
        <GameSettingsSection />

        <Section title={translate('settings.generale')}>
          <LanguageItem />
          <ThemeItem />
        </Section>

        <Section title={translate('settings.about')}>
          <SettingsItem text="settings.app_name" value={Env.EXPO_PUBLIC_NAME} />
          <SettingsItem
            text="settings.version"
            value={Env.EXPO_PUBLIC_VERSION}
            showDivider={false}
          />
        </Section>

        <Section title={translate('settings.support_us')}>
          <SettingsItem
            text="settings.share"
            icon={<Share color={iconColor} />}
            onPress={() => void shareApp()}
          />
          <SettingsItem
            text="settings.rate"
            icon={<Rate color={iconColor} />}
            onPress={() => void rateApp()}
          />
          <SettingsItem
            text="settings.support"
            icon={<Support color={iconColor} />}
            onPress={() => void openSupport()}
            showDivider={false}
          />
        </Section>

        <Section title={translate('settings.links')}>
          <SettingsItem text="settings.privacy" onPress={() => void openPrivacy()} />
          <SettingsItem text="settings.terms" onPress={() => void openTerms()} />
          <SettingsItem
            text="settings.github"
            icon={<Github color={iconColor} />}
            onPress={() => void openGithub()}
          />
          <SettingsItem
            text="settings.website"
            icon={<Website color={iconColor} />}
            onPress={() => void openWebsite()}
            showDivider={false}
          />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: GAME_PALETTE.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    backgroundColor: GAME_PALETTE.surface,
    overflow: 'hidden',
    ...continuousRadius(12),
  },
});
