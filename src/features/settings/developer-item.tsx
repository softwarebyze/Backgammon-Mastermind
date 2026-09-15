import { router } from 'expo-router';

import { SettingsItem } from './components/settings-item';

export function DeveloperItem() {
  return (
    <SettingsItem
      text="settings.developer_open"
      onPress={() => router.push('/developer')}
    />
  );
}
