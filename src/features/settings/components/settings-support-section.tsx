import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';

import { colors } from '@/components/ui';
import { Rate, Share, Support } from '@/components/ui/icons';
import { openStoreListing, shareApp } from '@/lib/app-links';
import { SettingsContainer } from './settings-container';
import { SettingsItem } from './settings-item';

type Props = {
  runExternalAction: (action: () => Promise<void>) => Promise<void>;
};

/** Share, rate, and send-feedback rows for Settings. */
export function SettingsSupportSection({ runExternalAction }: Props) {
  const posthog = usePostHog();
  const iconColor = colors.neutral[400];
  return (
    <SettingsContainer title="settings.support_us">
      <SettingsItem
        text="settings.share"
        icon={<Share color={iconColor} />}
        onPress={() => {
          posthog.capture('app_share_initiated');
          runExternalAction(shareApp);
        }}
      />
      <SettingsItem
        text="settings.rate"
        icon={<Rate color={iconColor} />}
        onPress={() => {
          posthog.capture('rate_app_initiated');
          runExternalAction(openStoreListing);
        }}
      />
      <SettingsItem
        text="settings.support"
        icon={<Support color={iconColor} />}
        testID="settings-feedback"
        onPress={() => {
          posthog.capture('support_opened');
          // The feedback form mails support too, with device details filled in.
          router.push('/feedback');
        }}
      />
    </SettingsContainer>
  );
}
