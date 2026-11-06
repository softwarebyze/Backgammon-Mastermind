import { Alert } from 'react-native';

import { SettingsContainer } from '@/features/settings/components/settings-container';
import { SettingsItem } from '@/features/settings/components/settings-item';
import { openExternalUrl, STORE_LINKS } from '@/lib/app-links';
import { translate } from '@/lib/i18n';

function open(url: string) {
  openExternalUrl(url).catch(() => {
    Alert.alert(translate('settings.link_error_title'), translate('settings.link_error_body'));
  });
}

/** Web only: store links at the top of Settings, which stay after Home's pill is hidden (#350). */
export function GetAppSettingsSection() {
  return (
    <SettingsContainer title="get_app.title">
      <SettingsItem text="get_app.app_store" onPress={() => open(STORE_LINKS.appStore)} />
      <SettingsItem text="get_app.google_play" onPress={() => open(STORE_LINKS.googlePlay)} />
    </SettingsContainer>
  );
}
