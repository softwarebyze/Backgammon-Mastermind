import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlunderMeter } from '@/features/game/components/blunder-meter';
import { cubeChoiceLabel, cubeMistakeTitle } from '@/features/game/components/cube-tutor-copy';
import { controlButtonStyles } from '@/features/game/control-buttons';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGame } from '@/features/game/use-game';
import { useLeaveGame } from '@/features/game/use-leave-game';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function CubeTutorOverlay() {
  const { leaveGame } = useLeaveGame();
  const { computerCubeError, retryCubeAnalysis, cubeTutorSession: session, keepCubeDecision, takeBackCubeDecision } = useGame();
  const { setTutorMode } = useGamePreferences();
  if (!session) {
    return computerCubeError
      ? (
          <Modal visible transparent onRequestClose={leaveGame}>
            <View style={styles.scrim}>
              <View style={[styles.card, styles.content]} accessibilityViewIsModal>
                <Text style={styles.title}>{translate('game.cube_tutor.computer_waiting')}</Text>
                <Text style={styles.text}>{translate('game.hint.error')}</Text>
                <Pressable testID="computer-cube-retry" accessibilityRole="button" onPress={retryCubeAnalysis} style={controlButtonStyles.primary}>
                  <Text style={controlButtonStyles.primaryText}>{translate('game.cube_tutor.retry')}</Text>
                </Pressable>
                <Pressable testID="computer-cube-home" accessibilityRole="button" onPress={leaveGame} style={controlButtonStyles.secondary}>
                  <Text style={controlButtonStyles.secondaryText}>{translate('game.controls.leave_game_a11y')}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )
      : null;
  }
  // While the choice is being checked play just pauses; there is nothing to show.
  if (session.phase !== 'mistake' || !session.analysis)
    return null;
  const best = session.analysis.best;
  const loss = session.loss ?? 0;
  // A roll already happened (the dice were seen), so it can only be noted.
  // Any other decision is still waiting: it can be taken back or kept.
  const rolled = session.attempted === 'roll';
  const turnOff = () => {
    setTutorMode(false);
    keepCubeDecision?.();
  };
  // eslint-disable-next-line max-params -- Mirrors the shared native analysis boundary.
  const button = (id: string, label: string, action: (() => void) | undefined, primary = false) => (
    <Pressable testID={id} accessibilityRole="button" onPress={action} style={primary ? controlButtonStyles.primary : controlButtonStyles.secondary}>
      <Text style={primary ? controlButtonStyles.primaryText : controlButtonStyles.secondaryText}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal visible transparent animationType="fade" onRequestClose={rolled ? keepCubeDecision : takeBackCubeDecision}>
      <View style={styles.scrim}>
        <View style={styles.card} accessibilityViewIsModal testID="cube-tutor">
          <ScrollView contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={styles.title} testID="cube-tutor-title">{cubeMistakeTitle(session.attempted, best)}</Text>
            <View style={styles.choices}>
              <Text style={styles.text} testID="cube-tutor-yours">{translate('game.cube_tutor.yours', { choice: cubeChoiceLabel(session.attempted) })}</Text>
              <Text style={styles.recommendation} testID="cube-tutor-recommendation">{translate('game.cube_tutor.best', { choice: cubeChoiceLabel(best) })}</Text>
            </View>
            <BlunderMeter loss={loss} />
            {rolled
              ? button('cube-tutor-dismiss', translate('game.cube_tutor.got_it'), keepCubeDecision, true)
              : (
                  <>
                    {button('cube-tutor-take-back', translate('game.tutor.take_back'), takeBackCubeDecision, true)}
                    {button('cube-tutor-keep', translate('game.cube_tutor.keep'), keepCubeDecision)}
                  </>
                )}
            <Pressable testID="cube-tutor-turn-off" accessibilityRole="button" accessibilityLabel={translate('game.tutor.turn_off_a11y')} onPress={turnOff} style={styles.link}>
              <Text style={styles.linkText}>{translate('game.tutor.turn_off')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 380, maxHeight: '90%', borderRadius: 16, backgroundColor: GAME_PALETTE.surface },
  content: { padding: 20, gap: 16 },
  title: { color: GAME_PALETTE.text, fontSize: 22, textAlign: 'center', ...interFont('semibold') },
  text: { color: GAME_PALETTE.textMuted, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  recommendation: { color: GAME_PALETTE.text, fontSize: 20, textAlign: 'center', ...interFont('semibold') },
  choices: { gap: 4 },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  linkText: { color: GAME_PALETTE.textMuted, fontSize: 15, ...interFont('medium') },
});
