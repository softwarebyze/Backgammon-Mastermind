import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { controlButtonStyles } from '@/features/game/control-buttons';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGame } from '@/features/game/use-game';
import { useLeaveGame } from '@/features/game/use-leave-game';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function CubeTutorOverlay() {
  const { leaveGame } = useLeaveGame();
  const { computerCubeError, retryCubeAnalysis, cubeTutorSession: session, cancelCubeTutor, continueCubeTutor, revealCubeTutor, retryCubeTutor } = useGame();
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
  const best = session.analysis?.best;
  const recommendation = best === 'roll'
    ? translate('game.money.no_double')
    : best ? translate(`game.match.${best === 'offer' ? 'double' : best}`) : '';
  // eslint-disable-next-line max-params -- Mirrors the shared native analysis boundary.
  const button = (id: string, label: string, action: (() => void) | undefined, primary = false) => (
    <Pressable testID={id} accessibilityRole="button" onPress={action} style={primary ? controlButtonStyles.primary : controlButtonStyles.secondary}>
      <Text style={primary ? controlButtonStyles.primaryText : controlButtonStyles.secondaryText}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal visible transparent animationType="fade" onRequestClose={cancelCubeTutor}>
      <View style={styles.scrim}>
        <View style={styles.card} accessibilityViewIsModal testID="cube-tutor">
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{translate('game.cube_tutor.title')}</Text>
            {session.phase === 'checking'
              ? (
                  <>
                    <ActivityIndicator color={GAME_PALETTE.accent} />
                    <Text style={styles.text}>{translate('game.cube_tutor.checking')}</Text>
                  </>
                )
              : <Text style={styles.text}>{translate(session.phase === 'error' ? 'game.cube_tutor.error' : 'game.cube_tutor.mistake')}</Text>}
            {session.revealed && <Text style={styles.recommendation} testID="cube-tutor-recommendation">{recommendation}</Text>}
            {session.phase === 'mistake' && !session.revealed && button('cube-tutor-reveal', translate('game.cube_tutor.show_hint'), revealCubeTutor)}
            {session.phase === 'error' && button('cube-tutor-retry', translate('game.cube_tutor.retry'), retryCubeTutor)}
            {button('cube-tutor-cancel', translate('game.cube_tutor.try_again'), cancelCubeTutor, true)}
            {session.phase !== 'checking' && button('cube-tutor-continue', translate('game.cube_tutor.continue'), continueCubeTutor)}
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
  recommendation: { color: GAME_PALETTE.text, fontSize: 24, textAlign: 'center', ...interFont('semibold') },
});
