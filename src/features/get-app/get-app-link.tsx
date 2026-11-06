import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { getItem, setItem } from '@/lib/storage';
import { interFont } from '@/lib/ui/fonts';
import { storeLinksForUserAgent } from './web-store-target';

const DISMISSED_KEY = 'web_get_app_dismissed';

function webStoreLinks() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined')
    return [];
  return storeLinksForUserAgent(navigator.userAgent, navigator.maxTouchPoints ?? 0);
}

/**
 * Web only: a small "Get the app" pill under Home's logo and title (#350, #351).
 * It sits in the layout (not over the brand or gear) so the v1.2.0 Home header
 * stays readable. Dismissing it hides it for good; Settings keeps the same links.
 */
export function GetAppLink() {
  const [dismissed, setDismissed] = useState(() => getItem<boolean>(DISMISSED_KEY) === true);
  const [links] = useState(webStoreLinks);
  if (dismissed || links.length === 0)
    return null;

  const single = links.length === 1 ? links[0] : null;
  return (
    <View testID="get-app-link" style={styles.pill}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={translate('get_app.title')}
        disabled={!single}
        onPress={single ? () => void Linking.openURL(single.url) : undefined}
        style={styles.main}
      >
        <Feather name="smartphone" size={14} color={GAME_PALETTE.accent} />
        <Text style={styles.label} numberOfLines={1}>{translate('get_app.title')}</Text>
      </Pressable>
      {single
        ? null
        : links.map(link => (
            <HoverPressable
              key={link.store}
              accessibilityRole="link"
              onPress={() => void Linking.openURL(link.url)}
              style={({ hovered }) => [styles.store, hovered && styles.storeHover]}
            >
              <Text style={styles.storeLabel}>{translate(`get_app.${link.store === 'appStore' ? 'app_store' : 'google_play'}`)}</Text>
            </HoverPressable>
          ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('get_app.dismiss')}
        hitSlop={8}
        onPress={() => {
          setDismissed(true);
          void setItem(DISMISSED_KEY, true);
        }}
        style={styles.close}
      >
        <Feather name="x" size={14} color={GAME_PALETTE.accentDim} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    minHeight: 32,
    paddingStart: 10,
    paddingEnd: 4,
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    backgroundColor: GAME_PALETTE.surface,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    flexShrink: 1,
  },
  label: {
    flexShrink: 1,
    fontSize: 12,
    color: GAME_PALETTE.accent,
    ...interFont('semibold'),
  },
  store: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 196, 153, 0.08)',
  },
  storeHover: {
    backgroundColor: 'rgba(255, 196, 153, 0.16)',
  },
  storeLabel: {
    fontSize: 12,
    color: GAME_PALETTE.accentDim,
    ...interFont('medium'),
  },
  close: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
