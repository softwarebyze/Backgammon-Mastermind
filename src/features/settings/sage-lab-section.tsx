// Demo-only: exercises the real bgsage engine end-to-end inside the app.
// Only rendered on the developer screen (non-production builds). Not part of
// the shipped product.
import { planSageTurn } from 'expo-bgsage';
import type { SageBoardPoint, SageGameState, SagePlayer } from 'expo-bgsage';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui';
import { SettingsContainer } from '@/features/settings/components/settings-container';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';

/** Standard opening, black (the computer's color) to move with 3-1. */
function openingBlack31(): SageGameState {
  const points: SageBoardPoint[] = Array.from({ length: 25 }, () => ({
    player: null,
    count: 0,
  }));
  const set = (p: number, player: SagePlayer, count: number) => {
    points[p] = { player, count };
  };
  set(24, 'white', 2);
  set(13, 'white', 5);
  set(8, 'white', 3);
  set(6, 'white', 5);
  set(1, 'black', 2);
  set(12, 'black', 5);
  set(17, 'black', 3);
  set(19, 'black', 5);
  return {
    points,
    bar: { white: 0, black: 0 },
    currentPlayer: 'black',
    dice: [3, 1],
    remainingDice: [3, 1],
  };
}

export function SageLabSection() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (running) return;
    hapticLight();
    setRunning(true);
    setResult(null);
    const t0 = Date.now();
    try {
      const moves = await planSageTurn(openingBlack31(), 2);
      const notation = moves.map((m) => `${m.from}/${m.to}`).join(' ');
      setResult(`SAGE OK: ${notation} (${Date.now() - t0}ms)`);
    } catch (e) {
      setResult(`SAGE ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  }, [running]);

  return (
    <SettingsContainer>
      <View style={styles.body}>
        <Text style={styles.title}>Sage engine lab (demo)</Text>
        <Text style={styles.blurb}>
          Runs the real bgsage neural-net engine at 2-ply on the opening 3-1
          (black to move). Book answer: the standard split-and-build play.
        </Text>
        <Pressable
          testID="sage-run-analysis"
          accessibilityRole="button"
          accessibilityLabel="Run Sage analysis"
          onPress={run}
          disabled={running}
          style={[styles.button, running && styles.buttonDisabled]}
        >
          <Text style={styles.buttonLabel}>
            {running ? 'Analyzing…' : 'Run Sage analysis'}
          </Text>
        </Pressable>
        {result !== null ? (
          <Text testID="sage-result" style={styles.result}>
            {result}
          </Text>
        ) : null}
      </View>
    </SettingsContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  title: {
    ...interFont('semibold'),
    fontSize: 15,
    color: GAME_PALETTE.text,
  },
  blurb: {
    ...interFont('regular'),
    fontSize: 13,
    color: GAME_PALETTE.textMuted,
    lineHeight: 18,
  },
  button: {
    backgroundColor: GAME_PALETTE.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    ...interFont('semibold'),
    fontSize: 15,
    color: '#1E0C02',
  },
  result: {
    ...interFont('medium'),
    fontSize: 14,
    color: GAME_PALETTE.text,
  },
});
