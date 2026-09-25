import type { SageBoardPoint, SageGameState, SageMove, SagePlayer } from 'expo-bgsage';
// Demo-only: exercises the real bgsage engine end-to-end inside the app.
// Only rendered on the developer screen (non-production builds). Not part of
// the shipped product.
import {
  planSageTurn,

} from 'expo-bgsage';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { SettingsContainer } from '@/features/settings/components/settings-container';
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
  // Rendered as separate exact strings: the Maestro flow asserts the status
  // ("SAGE OK") and the move notation ("17/20 19/20") verbatim, so each must
  // be its own text element — not embedded in a longer line.
  const [result, setResult] = useState<{ status: string; moves: string; ms: number } | null>(null);

  const run = useCallback(async () => {
    if (running)
      return;
    // [SageLab] markers go to logcat (ReactNativeJS) — CI scrapes them to
    // tell a missed tap apart from an engine hang/crash.
    console.log('[SageLab] run pressed');
    hapticLight();
    setRunning(true);
    setResult(null);
    const t0 = Date.now();
    try {
      const moves = await planSageTurn(openingBlack31(), 2);
      const notation = moves.map((m: SageMove) => `${m.from}/${m.to}`).join(' ');
      const ms = Date.now() - t0;
      console.log(`[SageLab] result: ${notation} (${ms}ms)`);
      setResult({ status: 'SAGE OK', moves: notation, ms });
    }
    catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[SageLab] error: ${msg}`);
      setResult({ status: 'SAGE ERROR', moves: msg, ms: Date.now() - t0 });
    }
    finally {
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
        {result !== null
          ? (
              <View testID="sage-result" style={styles.resultBlock}>
                <Text testID="sage-status" style={styles.result}>
                  {result.status}
                </Text>
                <Text testID="sage-moves" style={styles.resultDetail}>
                  {result.moves}
                </Text>
                <Text testID="sage-timing" style={styles.resultDetail}>
                  (
                  {result.ms}
                  ms)
                </Text>
              </View>
            )
          : null}
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
  resultBlock: {
    gap: 2,
  },
  resultDetail: {
    ...interFont('regular'),
    fontSize: 13,
    color: GAME_PALETTE.textMuted,
  },
});
