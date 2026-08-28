import type { GameMode, GameState } from '@/lib/game';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback } from 'react';

import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { FocusAwareStatusBar } from '@/components/ui';
import { showErrorMessage } from '@/components/ui/utils';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGame } from '@/features/game/use-game';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { confirmAction } from '@/lib/confirm';
import { ensureGameSfxReady } from '@/lib/game-sfx/play-game-sfx';
import { canContinueSavedGame, isResumableGame } from '@/lib/game/persistence';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { LESSON_IDS } from '@/lib/learn/curriculum';
import {
  allLessonsComplete,
  completedLessonCount,
  isReadyToPlay,
} from '@/lib/learn/progress';
import { interFont } from '@/lib/ui/fonts';
import { GAME_CHROME_MAX_WIDTH, isLandscapeLayout } from '@/lib/ui/game-chrome';
import { continuousRadius } from '@/lib/ui/native-styles';
import { WEB_HEADER_INSET } from '@/lib/ui/web-layout';

function startGameFromHome(
  mode: GameMode,
  state: GameState | null,
  startGame: (mode: GameMode) => void,
) {
  hapticLight();
  void ensureGameSfxReady();
  if (!isResumableGame(state)) {
    startGame(mode);
    router.replace('/game');
    return;
  }

  if (Platform.OS === 'web') {
    // window.confirm is binary — OK = new game; Resume on home continues
    confirmAction({
      title: translate('home.confirm_title'),
      message: translate('home.confirm_web'),
      confirmLabel: translate('home.confirm_new'),
      destructive: true,
      onConfirm: () => {
        startGame(mode);
        router.replace('/game');
      },
    });
    return;
  }

  Alert.alert(
    translate('home.confirm_title'),
    translate('home.confirm_native'),
    [
      { text: translate('home.confirm_continue'), onPress: () => router.replace('/game') },
      {
        text: translate('home.confirm_new'),
        style: 'destructive',
        onPress: () => {
          startGame(mode);
          router.replace('/game');
        },
      },
      { text: translate('home.confirm_cancel'), style: 'cancel' },
    ],
  );
}

function resumeGameFromHome(state: GameState | null, resumeGame: () => boolean) {
  hapticLight();
  if (isResumableGame(state) || resumeGame()) {
    router.replace('/game');
    return;
  }
  showErrorMessage(translate('home.resume_none'));
}

/* eslint-disable max-lines-per-function -- home mode menu composition */
export function HomeScreen() {
  const { state, startGame, resumeGame } = useGame();
  const { progress } = useLearnProgress();
  const posthog = usePostHog();
  const { width, height } = useWindowDimensions();
  const landscape = isLandscapeLayout(width, height);
  const canResume = canContinueSavedGame(state);
  const learnDone = completedLessonCount(progress);
  const learnReady = isReadyToPlay(progress);
  const learnLessonsDone = allLessonsComplete(progress);

  const handleStart = useCallback(
    (mode: GameMode) => {
      posthog.capture('game_started', { mode, had_saved_game: isResumableGame(state) });
      startGameFromHome(mode, state, startGame);
    },
    [posthog, startGame, state],
  );

  const handleResume = useCallback(
    () => {
      posthog.capture('game_resumed');
      resumeGameFromHome(state, resumeGame);
    },
    [posthog, resumeGame, state],
  );

  const handleLearn = useCallback(() => {
    hapticLight();
    posthog.capture('learn_opened', {
      lessons_completed: learnDone,
      quiz_passed: progress.quizPassed,
    });
    if (learnReady || learnLessonsDone) {
      router.push('/learn/graduation');
      return;
    }
    router.push('/learn');
  }, [learnDone, learnLessonsDone, learnReady, posthog, progress.quizPassed]);

  const learnSub = learnReady
    ? translate('learn.home_cta_ready')
    : learnLessonsDone
      ? translate('learn.home_cta_quiz')
      : learnDone > 0
        ? translate('learn.home_cta_progress', {
            done: learnDone,
            total: LESSON_IDS.length,
          })
        : translate('learn.home_cta_sub');

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.root, landscape ? styles.rootLandscape : null]}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.brand, landscape ? styles.brandLandscape : null]}>
          <View style={[styles.logoContainer, landscape ? styles.logoLandscape : null]}>
            <Image
              source={require('../../../assets/brand/display-logo.png')}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>

          <Text accessibilityRole="header" style={[styles.title, landscape ? styles.titleLandscape : null]}>
            {translate('home.title')}
          </Text>
          {landscape
            ? null
            : <Text style={styles.subtitle}>{translate('home.subtitle')}</Text>}

          {landscape
            ? null
            : (
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <View style={styles.dividerDiamond} />
                  <View style={styles.dividerLine} />
                </View>
              )}
        </View>

        <View style={[styles.buttons, landscape ? styles.buttonsLandscape : styles.buttonsPortrait]}>
          {canResume && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translate('home.resume_a11y')}
              testID="resume-game-button"
              style={({ pressed }) => [
                styles.modeBtn,
                landscape ? styles.modeBtnLandscape : null,
                styles.resumeBtn,
                pressed && styles.pressed,
              ]}
              onPress={handleResume}
            >
              <View style={styles.btnIconSlot}>
                <Feather name="play-circle" size={24} color="#A0D080" />
              </View>
              <View style={styles.btnTextCol}>
                <Text style={[styles.btnLabel, { color: '#A0D080' }]}>{translate('home.resume')}</Text>
                {landscape
                  ? null
                  : <Text style={[styles.btnSub, { color: '#6A9A50' }]}>{translate('home.resume_sub')}</Text>}
              </View>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate('learn.home_cta')}
            style={({ pressed }) => [
              styles.modeBtn,
              landscape ? styles.modeBtnLandscape : null,
              styles.learnBtn,
              pressed && styles.pressed,
            ]}
            onPress={handleLearn}
          >
            <View style={styles.btnIconSlot}>
              <Feather name="book-open" size={24} color={GAME_PALETTE.accent} />
            </View>
            <View style={styles.btnTextCol}>
              <Text style={[styles.btnLabel, { color: GAME_PALETTE.accent }]}>
                {translate('learn.home_cta')}
              </Text>
              {landscape
                ? null
                : (
                    <Text style={[styles.btnSub, { color: GAME_PALETTE.accentDim }]}>
                      {learnSub}
                    </Text>
                  )}
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate('home.vs_computer_a11y')}
            style={({ pressed }) => [
              styles.modeBtn,
              landscape ? styles.modeBtnLandscape : null,
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => handleStart('vs-computer')}
          >
            <View style={styles.btnIconSlot}>
              <Feather name="cpu" size={24} color={GAME_PALETTE.bg} />
            </View>
            <View style={styles.btnTextCol}>
              <Text style={[styles.btnLabel, { color: GAME_PALETTE.bg }]}>{translate('home.vs_computer')}</Text>
              {landscape
                ? null
                : <Text style={[styles.btnSub, { color: '#4A2A10' }]}>{translate('home.vs_computer_sub')}</Text>}
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate('home.two_players_a11y')}
            style={({ pressed }) => [
              styles.modeBtn,
              landscape ? styles.modeBtnLandscape : null,
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => handleStart('vs-human')}
          >
            <View style={styles.btnIconSlot}>
              <Feather name="users" size={24} color={GAME_PALETTE.accent} />
            </View>
            <View style={styles.btnTextCol}>
              <Text style={[styles.btnLabel, { color: GAME_PALETTE.accent }]}>{translate('home.two_players')}</Text>
              {landscape
                ? null
                : <Text style={[styles.btnSub, { color: GAME_PALETTE.accentDim }]}>{translate('home.two_players_sub')}</Text>}
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
  },
  root: {
    flexGrow: 1,
    backgroundColor: GAME_PALETTE.bg,
    alignItems: 'center',
    justifyContent: Platform.OS === 'web' ? 'flex-start' : 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? WEB_HEADER_INSET : 8,
    paddingBottom: 32,
  },
  rootLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingTop: 12,
    paddingBottom: 16,
    gap: 16,
  },
  brand: {
    alignItems: 'center',
    width: '100%',
    maxWidth: GAME_CHROME_MAX_WIDTH,
  },
  brandLandscape: {
    width: 'auto',
    flexShrink: 1,
    maxWidth: 320,
  },
  logoContainer: {
    width: 110,
    height: 110,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: GAME_PALETTE.accent,
    backgroundColor: GAME_PALETTE.bg,
    marginBottom: 20,
    marginTop: 8,
    boxShadow: '0 4px 16px rgba(212, 168, 67, 0.35)',
    ...continuousRadius(28),
  },
  logoLandscape: {
    width: 72,
    height: 72,
    marginBottom: 8,
    marginTop: 0,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    color: GAME_PALETTE.accent,
    letterSpacing: 4,
    ...interFont('extrabold'),
    textAlign: 'center',
  },
  titleLandscape: {
    fontSize: 24,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 13,
    color: GAME_PALETTE.accentDim,
    marginTop: 4,
    letterSpacing: 1,
    ...interFont('regular'),
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    marginVertical: 24,
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
  buttons: {
    maxWidth: GAME_CHROME_MAX_WIDTH,
    gap: 14,
    marginBottom: 24,
    flexShrink: 1,
  },
  buttonsPortrait: {
    width: '100%',
  },
  buttonsLandscape: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    marginBottom: 0,
    justifyContent: 'center',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 2,
    gap: 16,
    ...continuousRadius(16),
  },
  modeBtnLandscape: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 10,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.88,
  },
  resumeBtn: {
    backgroundColor: '#1A2A14',
    borderColor: '#4A6A30',
  },
  primaryBtn: {
    backgroundColor: GAME_PALETTE.accent,
    borderColor: '#F0C060',
  },
  secondaryBtn: {
    backgroundColor: GAME_PALETTE.surface,
    borderColor: GAME_PALETTE.accentDim,
  },
  learnBtn: {
    backgroundColor: GAME_PALETTE.surface,
    borderColor: GAME_PALETTE.accent,
  },
  btnIconSlot: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  btnLabel: {
    fontSize: 17,
    ...interFont('bold'),
  },
  btnSub: {
    fontSize: 12,
    marginTop: 2,
    ...interFont('regular'),
  },
});
