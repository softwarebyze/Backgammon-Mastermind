import { reloadAppAsync } from 'expo';
import * as Updates from 'expo-updates';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  error: unknown;
  componentStack?: string | null;
};

/** Minimal crash UI for PostHogErrorBoundary — keeps users unstuck without a full redesign. */
export function PostHogErrorFallback({ error }: Props) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <View style={styles.root} accessibilityRole="alert">
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>Restart the app to continue.</Text>
      {__DEV__ ? <Text style={styles.dev}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void Updates.reloadAsync().catch(() => {
            if (typeof globalThis.location?.reload === 'function') {
              globalThis.location.reload();
              return;
            }
            void reloadAppAsync('PostHog error recovery');
          });
        }}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonLabel}>Reload</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1E0C02',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  title: {
    color: '#F5E6D3',
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    color: '#C9B8A4',
    fontSize: 16,
    lineHeight: 22,
  },
  dev: {
    color: '#E8A598',
    fontSize: 13,
    fontFamily: 'Courier',
  },
  button: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#C45C26',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: '#FFF8F0',
    fontSize: 16,
    fontWeight: '600',
  },
});
