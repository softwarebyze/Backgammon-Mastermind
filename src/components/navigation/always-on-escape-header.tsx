import type { NativeStackHeaderProps } from 'expo-router';
import { getHeaderTitle, Header } from 'expo-router/react-navigation';

import { StackEscapeButton } from '@/components/navigation/stack-escape-button';

/**
 * JS header that always shows the escape chevron, even when canGoBack is false.
 * Screen actions (headerRight) pass through, so web matches native.
 */
export function AlwaysOnEscapeHeader({ options, route }: NativeStackHeaderProps) {
  return (
    <Header
      title={getHeaderTitle(options, route.name)}
      headerLeft={() => <StackEscapeButton />}
      headerRight={options.headerRight}
      headerTransparent={options.headerTransparent}
      headerTintColor={options.headerTintColor}
      headerStyle={options.headerStyle}
      headerShadowVisible={options.headerShadowVisible}
      headerTitleStyle={options.headerTitleStyle}
      headerBackButtonDisplayMode={options.headerBackButtonDisplayMode}
    />
  );
}
