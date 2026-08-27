import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  error: unknown;
  componentStack?: string | null;
  onRetry?: () => void;
};

/** Crash UI for PostHogErrorBoundary / expo-router ErrorBoundary. */
export function PostHogErrorFallback({ error, onRetry }: Props) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <View style={styles.root} accessibilityRole="alert" testID="posthog-error-fallback">
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>Restart the app to continue.</Text>
      {__DEV__ ? <Text style={styles.dev}>{message}</Text> : null}
      {onRetry
        ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry"
              testID="posthog-error-retry"
              onPress={onRetry}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text style={styles.buttonLabel}>Retry</Text>
            </Pressable>
          )
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  title: {
    color: GAME_PALETTE.accent,
    fontSize: 22,
    ...interFont('bold'),
  },
  body: {
    color: GAME_PALETTE.textMuted,
    fontSize: 16,
    lineHeight: 22,
    ...interFont('regular'),
  },
  dev: {
    color: '#E8A598',
    fontSize: 13,
    ...interFont('regular'),
  },
  button: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: GAME_PALETTE.control,
    paddingHorizontal: 18,
    paddingVertical: 12,
    ...continuousRadius(10),
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    ...interFont('semibold'),
  },
});
