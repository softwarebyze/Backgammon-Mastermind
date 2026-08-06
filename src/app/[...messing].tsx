import { Feather } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { FocusAwareStatusBar } from '@/components/ui';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';
import { WEB_HEADER_INSET } from '@/lib/ui/web-layout';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: false }} />
      <FocusAwareStatusBar />
      <View style={styles.root} testID="not-found-screen">
        <View style={styles.badge}>
          <Feather name="compass" size={36} color={GAME_PALETTE.accent} />
        </View>

        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Off the board</Text>
        <Text style={styles.body}>
          That page isn&apos;t part of Backgammon Mastermind. Head home to learn
          or start a game.
        </Text>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDiamond} />
          <View style={styles.dividerLine} />
        </View>

        <Link href="/" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Go to home"
            style={({ pressed }) => [styles.homeBtn, pressed && styles.pressed]}
            testID="not-found-home"
          >
            <Feather name="home" size={20} color={GAME_PALETTE.bg} />
            <Text style={styles.homeLabel}>Back to home</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
    alignItems: 'center',
    justifyContent: Platform.OS === 'web' ? 'flex-start' : 'center',
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'web' ? WEB_HEADER_INSET + 48 : 24,
    paddingBottom: 40,
  },
  badge: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 2,
    borderColor: GAME_PALETTE.accent,
    marginBottom: 20,
    ...continuousRadius(20),
  },
  code: {
    fontSize: 56,
    color: GAME_PALETTE.accent,
    letterSpacing: 6,
    ...interFont('extrabold'),
  },
  title: {
    fontSize: 22,
    color: GAME_PALETTE.text,
    marginTop: 8,
    ...interFont('bold'),
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: GAME_PALETTE.textMuted,
    marginTop: 10,
    maxWidth: 320,
    lineHeight: 22,
    textAlign: 'center',
    ...interFont('regular'),
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginVertical: 28,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: GAME_PALETTE.surfaceBorder,
  },
  dividerDiamond: {
    width: 8,
    height: 8,
    backgroundColor: GAME_PALETTE.accent,
    transform: [{ rotate: '45deg' }],
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GAME_PALETTE.accent,
    borderWidth: 2,
    borderColor: '#F0C060',
    paddingVertical: 14,
    paddingHorizontal: 28,
    ...continuousRadius(14),
  },
  pressed: {
    opacity: 0.88,
  },
  homeLabel: {
    fontSize: 16,
    color: GAME_PALETTE.bg,
    ...interFont('bold'),
  },
});
