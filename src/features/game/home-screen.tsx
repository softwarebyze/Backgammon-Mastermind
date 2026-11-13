import type { GameMode, GameState } from '@/lib/game';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useState } from 'react';

import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SettingsHeaderButton } from '@/components/navigation/settings-header-button';
import { FocusAwareStatusBar } from '@/components/ui';
import { showErrorMessage } from '@/components/ui/utils';
import { HomeBoardArt } from '@/features/game/components/home-board-art';
import { HomeCard } from '@/features/game/components/home-card';
import { HomeGameSetup } from '@/features/game/components/home-game-setup';
import { HOME_INK } from '@/features/game/components/home-ink';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { requestReplaceActiveGame } from '@/features/game/request-new-game';
import { SavedGameRecoveryBanner } from '@/features/game/saved-game-recovery-banner';
import { useGame } from '@/features/game/use-game';
import { useWebVisibleHeight } from '@/features/game/use-web-visible-height';
import { learnHomeHref } from '@/features/learn/learn-home-href';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { settingProperties } from '@/lib/analytics/settings-analytics';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { ensureGameSfxReady } from '@/lib/game-sfx/play-game-sfx';
import { createMatchGame } from '@/lib/game/match';
import {
  canContinueSavedGame,
  hasQuarantinedSession,
  hasReviewableCompletedGame,
  isResumableGame,
} from '@/lib/game/persistence';
import { canOpenPersistedGame } from '@/lib/game/resume-game';
import { hapticLight } from '@/lib/haptics';
import { translate, useLayoutIsRTL } from '@/lib/i18n';
import { LESSON_IDS } from '@/lib/learn/curriculum';
import {
  allLessonsComplete,
  completedLessonCount,
  isReadyToPlay,
} from '@/lib/learn/progress';
import { interFont } from '@/lib/ui/fonts';
import { GAME_CHROME_MAX_WIDTH } from '@/lib/ui/game-chrome';
import { contentEdgePadding, useLayoutMetrics } from '@/lib/ui/layout-metrics';
import { continuousRadius } from '@/lib/ui/native-styles';

function openSavedGameFromHome(state: GameState | null, resumeGame: () => boolean) {
  hapticLight();
  if (canOpenPersistedGame(state) || resumeGame()) {
    router.replace('/game');
    return;
  }
  showErrorMessage(translate('home.resume_none'));
}

/* eslint-disable max-lines-per-function -- home mode menu composition */
/** Present game setup, saved-game recovery and standalone learning, position and clock destinations. */
export function HomeScreen() {
  const { state, startGame, startFromPosition, resumeGame } = useGame();
  const { preferences } = useGamePreferences();
  const { progress } = useLearnProgress();
  const posthog = usePostHog();
  const { insets, landscape } = useLayoutMetrics();
  const { width, height: windowHeight } = useWindowDimensions();
  // On web, lay out for what the browser shows: iOS Safari's toolbar covers
  // the bottom of the window, and Start must not sit under it.
  const webVisible = useWebVisibleHeight();
  const height = webVisible == null ? windowHeight : Math.min(windowHeight, webVisible);
  const covered = windowHeight - height;
  // Native swaps left and right itself under RTL; web needs the side spelled out.
  const layoutIsRTL = useLayoutIsRTL();
  const gearSide = Platform.OS === 'web' && layoutIsRTL ? 'left' : 'right';
  // No navigation bar: start just under the status bar, a little lower on
  // tall phones so the brand isn't jammed against the top.
  // Short phones in Safari (about 550-660px visible): a smaller brand and
  // cards without their second line, so every button fits without scrolling (#346).
  const short = !landscape && height < 700;
  // Same for a phone held sideways: one-line cards and tighter gaps.
  const dense = short || (landscape && height < 400);
  // Very short phones (320x480): slimmer tiles and tighter setup, so a match still fits.
  const tiny = !landscape && height < 520;
  const canResume = canContinueSavedGame(state);
  const canReview = !canResume && hasReviewableCompletedGame(state);
  const [showRecovery, setShowRecovery] = useState(hasQuarantinedSession);
  const learnDone = completedLessonCount(progress);
  const learnReady = isReadyToPlay(progress);
  const learnLessonsDone = allLessonsComplete(progress);

  const handleStart = useCallback(
    (mode: GameMode, length: number | null, crawfordRule = true) => {
      hapticLight();
      void ensureGameSfxReady();
      requestReplaceActiveGame({
        source: 'home',
        liveState: state,
        onReplace: () => {
          posthog.capture('game_started', {
            mode,
            had_saved_game: isResumableGame(state),
            tutor_mode: preferences.tutorMode,
            ...settingProperties(preferences),
            ...(length ? { match_length: length, crawford_rule: crawfordRule } : {}),
          });
          if (length !== null)
            startFromPosition(createMatchGame(length, mode, crawfordRule));
          else
            startGame(mode);
          router.replace('/game');
        },
        onContinue: () => router.replace('/game'),
      });
    },
    [posthog, preferences, startGame, startFromPosition, state],
  );

  const handleResume = useCallback(
    () => {
      posthog.capture('game_resumed');
      openSavedGameFromHome(state, resumeGame);
    },
    [posthog, resumeGame, state],
  );

  const handleReview = useCallback(
    () => {
      posthog.capture('game_reviewed');
      openSavedGameFromHome(state, resumeGame);
    },
    [posthog, resumeGame, state],
  );

  const handleLearn = useCallback(() => {
    hapticLight();
    posthog.capture('learn_opened', {
      lessons_completed: learnDone,
      quiz_passed: progress.quizPassed,
    });
    router.push(learnHomeHref());
  }, [learnDone, posthog, progress.quizPassed]);

  // A second line only when it reports something: nothing to say before the first lesson.
  const learnSub = learnReady
    ? translate('learn.home_cta_ready')
    : learnLessonsDone
      ? translate('learn.home_cta_quiz')
      : learnDone > 0
        ? translate('learn.home_cta_progress', {
            done: learnDone,
            total: LESSON_IDS.length,
          })
        : undefined;

  // Landscape phones: a one-line header, then the choices on the left and
  // the match details and Start on the right, so Start is always on screen (#346).
  const split = landscape && height < 520;
  const panelWidth = Math.min(GAME_CHROME_MAX_WIDTH, width - 48);
  // Tall screens open on a picture of the board; it grows with the room there is.
  const artHeight = split || short ? 0 : Math.min(150, Math.round((height - 640) * 0.75));
  const showArt = artHeight >= 84;
  // The picture starts below the settings gear.
  const topSpace = insets.top + (showArt ? 52 : landscape || short ? 8 : Math.round(Math.min(56, Math.max(16, height * 0.05))));
  const brand = showArt
    ? (
        <View>
          <HomeBoardArt width={panelWidth} height={artHeight} />
          <View style={styles.artCopy}>
            <Text accessibilityRole="header" style={[styles.artTitle, { writingDirection: layoutIsRTL ? 'rtl' : 'ltr' }, gearSide === 'left' && styles.artTitleWebRtl]}>{translate('home.title')}</Text>
          </View>
        </View>
      )
    : (
        <View style={[styles.brand, short && styles.brandShort, short && gearSide === 'left' && styles.gearClear, split && styles.brandSplit]}>
          <Image source={require('../../../assets/brand/display-logo.png')} style={[styles.logo, short && styles.logoShort, split && styles.logoSplit]} resizeMode="cover" accessible={false} />
          <Text accessibilityRole="header" style={[styles.title, short && styles.titleShort, split && styles.titleSplit]} numberOfLines={short ? 2 : split ? 1 : undefined}>{translate('home.title')}</Text>
        </View>
      );
  const resumeCard = canResume
    ? (
        <HomeCard
          testID="resume-game-button"
          accessibilityLabel={translate('home.resume_a11y')}
          symbol="play-circle"
          label={translate('home.resume')}
          onPress={handleResume}
          prominent
          dense={dense}
          inline={split}
        />
      )
    : null;
  const reviewCard = canReview
    ? (
        <HomeCard
          testID="review-last-game-button"
          accessibilityLabel={translate('home.review_a11y')}
          symbol="eye"
          label={translate('home.review')}
          onPress={handleReview}
          prominent
          dense={dense}
          inline={split}
        />
      )
    : null;
  // Learning leads: a full-width card that shows how far through the course you are.
  const tiles = (
    <View style={styles.destinations}>
      <HomeCard
        testID="learn-button"
        accessibilityLabel={translate('learn.home_cta')}
        symbol="book-open"
        label={translate('learn.home_cta')}
        sub={dense ? undefined : learnSub}
        onPress={handleLearn}
        featured
        progress={learnDone > 0 && !learnReady ? learnDone / LESSON_IDS.length : undefined}
        dense={dense}
        compact={split || tiny}
      />
      <View style={[styles.tiles, !split && panelWidth < 320 && styles.tilesStacked]}>
        <HomeCard
          testID="position-setup-button"
          accessibilityLabel={translate('positions.setup')}
          symbol="grid"
          label={translate('positions.setup')}
          onPress={() => router.push('/position')}
          dense={dense}
          compact={split || tiny}
        />
        <HomeCard
          testID="game-clock-button"
          accessibilityLabel={translate('timer.title')}
          symbol="clock"
          label={translate('timer.title')}
          onPress={() => {
            hapticLight();
            router.push('/timer');
          }}
          dense={dense}
          compact={split || tiny}
        />
      </View>
    </View>
  );

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        testID="home-screen"
        style={styles.scroll}
        contentContainerStyle={[
          styles.root,
          // Tablets and desktop: the column sits in the middle of the window.
          width >= 600 ? styles.rootCentered : null,
          split ? styles.rootSplit : null,
          contentEdgePadding(insets, { left: 24, right: 24, bottom: (dense ? 8 : landscape ? 16 : 32) + covered }),
          { paddingTop: topSpace },
        ]}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.settingsCorner, { top: insets.top + 4, [gearSide]: (gearSide === 'left' ? insets.left : insets.right) + 8 }]}>
          <SettingsHeaderButton />
        </View>
        {split
          ? (
              <View style={styles.splitStage}>
                <View style={[styles.splitHeader, gearSide === 'left' && styles.gearClear]}>
                  {brand}
                  {resumeCard}
                  {reviewCard}
                </View>
                {showRecovery && (
                  <SavedGameRecoveryBanner onDismiss={() => setShowRecovery(false)} />
                )}
                <HomeGameSetup onStart={handleStart} columns aside={tiles} />
              </View>
            )
          : (
              <View style={[styles.panel, dense && styles.panelShort, { width: panelWidth }]}>
                {brand}
                {showRecovery && (
                  <SavedGameRecoveryBanner onDismiss={() => setShowRecovery(false)} />
                )}
                {resumeCard}
                {reviewCard}
                <HomeGameSetup onStart={handleStart} tight={tiny} flat={tiny || panelWidth < 300} />
                {tiles}
              </View>
            )}
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
    alignItems: 'center',
    gap: 24,
    backgroundColor: GAME_PALETTE.bg,
  },
  rootCentered: {
    justifyContent: 'center',
  },
  rootSplit: {
    alignItems: 'stretch',
  },
  splitStage: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    gap: 8,
  },
  // Clear of the settings gear in the top corner.
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 40,
  },
  // The gear moved to the left (Hebrew on web): clear that side instead.
  gearClear: {
    paddingRight: 0,
    paddingLeft: 40,
  },
  settingsCorner: {
    position: 'absolute',
    zIndex: 10,
  },
  panel: {
    gap: 12,
  },
  panelShort: {
    gap: 8,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  // Clear of the settings gear in the top corner (see gearClear).
  brandShort: {
    marginBottom: 0,
    paddingRight: 40,
  },
  brandSplit: {
    flex: 1,
    marginBottom: 0,
    gap: 10,
    paddingRight: 0,
    paddingLeft: 0,
  },
  logo: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderColor: HOME_INK.hairline,
    ...continuousRadius(13),
  },
  logoShort: {
    width: 44,
    height: 44,
    ...continuousRadius(10),
  },
  logoSplit: {
    width: 36,
    height: 36,
    ...continuousRadius(9),
  },
  title: {
    flex: 1,
    color: HOME_INK.ivory,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    ...interFont('bold'),
  },
  titleShort: {
    fontSize: 20,
    lineHeight: 22,
  },
  titleSplit: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
    fontSize: 19,
    lineHeight: 24,
  },
  // The picture fades out at its foot; the name stands on the fade.
  artCopy: {
    marginTop: -24,
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  // Web lays a Latin name out left-to-right whatever the app language: align it by hand.
  artTitleWebRtl: {
    textAlign: 'right',
  },
  // Its writing direction follows the app language, so the Latin name starts on the right in Hebrew and Arabic.
  artTitle: {
    color: HOME_INK.ivory,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    ...interFont('bold'),
  },
  destinations: {
    gap: 10,
    marginTop: 4,
  },
  tiles: {
    flexDirection: 'row',
    gap: 10,
  },
  // Narrow phones: one tile per row, so neither label wraps into a column.
  tilesStacked: {
    flexDirection: 'column',
  },
});
