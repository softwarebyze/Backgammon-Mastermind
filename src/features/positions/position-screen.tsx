import type { PositionFocus } from './position-strip';
import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Keyboard, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { FocusAwareStatusBar } from '@/components/ui';
import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { requestReplaceActiveGame } from '@/features/game/request-new-game';
import { useGame } from '@/features/game/use-game';
import { translate } from '@/lib/i18n';
import { newPosition, positionGame, validatePosition } from '@/lib/positions/position';
import { loadSavedPositions } from '@/lib/positions/saved-positions';
import { contentEdgePadding, useLayoutMetrics } from '@/lib/ui/layout-metrics';
import { WEB_SETTINGS_TOP_PADDING } from '@/lib/ui/web-layout';
import { PositionBoardEditor } from './position-board-editor';
import { PositionAction } from './position-controls';
import { positionError } from './position-errors';
import { PositionExchange } from './position-exchange';
import { PositionHistoryActions } from './position-history-actions';
import { PositionSaved } from './position-saved';
import { PositionStrip } from './position-strip';
import { STRIP_HEIGHT, styles } from './position-styles';
import { usePositionHistory } from './use-position-history';

/** Toolbar, strip, tool row and gaps around the board on a phone. */
const CHROME_HEIGHT = 52 + STRIP_HEIGHT + 56 + 12 * 4;

function initialPosition(data: string | string[] | undefined): { position: Position; error: string } {
  if (data === undefined)
    return { position: newPosition(), error: '' };
  try {
    if (typeof data !== 'string' || data.length > 10000)
      throw new Error('Invalid position link');
    return { position: validatePosition(JSON.parse(data)), error: '' };
  }
  catch (err) { return { position: newPosition(), error: positionError(err) }; }
}

function validationError(position: Position): string {
  try {
    validatePosition(position);
    return '';
  }
  catch (err) { return positionError(err); }
}

export function PositionScreen() {
  const { data } = useLocalSearchParams<{ data?: string }>();
  // Key the workspace by URL so a second shared link is never ignored on native.
  return <PositionWorkspace key={data ?? 'editor'} data={data} />;
}

/* eslint-disable max-lines-per-function -- one workspace composes the board and tools */
function PositionWorkspace({ data }: { data?: string }) {
  const navigation = useNavigation();
  const { state, startFromPosition } = useGame();
  const [initial] = useState(() => initialPosition(data));
  const history = usePositionHistory(() => initial.position);
  const { position } = history;
  const [error, setError] = useState(initial.error);
  const [location, setLocation] = useState<PositionLocation | null>(null);
  const [focus, setFocus] = useState<PositionFocus>(null);
  const [color, setColor] = useState<Player>('white');
  const [saved, setSaved] = useState(loadSavedPositions);
  const [tool, setTool] = useState<'play' | 'saved' | 'exchange' | null>(null);
  const [mode, setMode] = useState<'vs-human' | 'vs-computer'>('vs-human');
  const { width, height } = useWindowDimensions();
  const { insets } = useLayoutMetrics();
  const maxBoardHeight = Math.max(260, Math.min(width < 600 ? 520 : 560, height - CHROME_HEIGHT - 120));
  const dims = fitBoardToViewport(Math.min(880, Math.max(200, width - 32 - insets.left - insets.right)), maxBoardHeight, { extraHeight: 36, checkerCap: 48 });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <PositionHistoryActions canUndo={history.canUndo} canRedo={history.canRedo} onUndo={history.undo} onRedo={history.redo} />,
    });
  }, [navigation, history.canUndo, history.canRedo, history.undo, history.redo]);

  const change = (p: Position) => {
    history.change(p);
    setError('');
  };
  const replace = (p: Position) => {
    change(p);
    setLocation(null);
    setFocus(null);
  };
  const selectLocation = (next: PositionLocation | null) => {
    setLocation(next);
    if (next !== null)
      setFocus(null);
  };
  const selectFocus = (next: PositionFocus) => {
    Keyboard.dismiss();
    setLocation(null);
    setFocus(next);
  };
  const openTool = (next: 'play' | 'saved' | 'exchange') => {
    Keyboard.dismiss();
    setTool(tool === next ? null : next);
  };

  if (initial.error && data) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text accessibilityRole="alert" testID="position-error" style={styles.error}>{initial.error}</Text>
        <PositionAction label={translate('positions.setup')} onPress={() => router.replace('/position')} />
      </ScrollView>
    );
  }
  // Invalid edits (e.g. a half-entered roll) stay visible, with actions disabled.
  const invalid = validationError(position);
  const finished = position.borneOff.white === 15 || position.borneOff.black === 15;
  const play = () => {
    try {
      const next = positionGame(position, mode);
      requestReplaceActiveGame({ source: 'position', liveState: state, onReplace: () => {
        startFromPosition(next);
        router.replace('/game');
      } });
    }
    catch (err) { setError(positionError(err)); }
  };
  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        testID="position-screen"
        style={styles.root}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { maxWidth: dims.boardOuterWidth + 32 + insets.left + insets.right, paddingTop: WEB_SETTINGS_TOP_PADDING }, contentEdgePadding(insets, { left: 16, right: 16, bottom: 32 })]}
      >
        {!!data && <Text style={styles.caption}>{translate('positions.shared_intro')}</Text>}
        <PositionBoardEditor
          position={position}
          dimensions={dims}
          location={location}
          color={color}
          onColor={setColor}
          onLocation={selectLocation}
          onChange={change}
          onStrokeStart={history.strokeStart}
          onStrokeEnd={history.strokeEnd}
          actions={(
            <>
              <PositionAction label={translate('positions.standard')} testID="position-standard" compact onPress={() => replace(newPosition())} />
              <PositionAction label={translate('positions.empty')} testID="position-empty" compact iconOnly={dims.boardOuterWidth < 420} symbol="trash-2" onPress={() => replace(newPosition(true))} />
            </>
          )}
        />
        <PositionStrip
          position={position}
          location={location}
          focus={focus}
          color={color}
          onChange={change}
          onLocation={selectLocation}
          onFocus={selectFocus}
        />
        {!!invalid && <Text accessibilityRole="alert" testID="position-invalid" style={styles.error}>{invalid}</Text>}
        {!!error && <Text accessibilityRole="alert" testID="position-error" style={styles.error}>{error}</Text>}
        <View style={styles.workspaceActions}>
          <PositionAction compact symbol="share-2" label={translate('positions.exchange_short')} testID="position-exchange-toggle" selected={tool === 'exchange'} onPress={() => openTool('exchange')} />
          <PositionAction compact symbol="bookmark" label={translate('positions.saved_short')} testID="position-saved-toggle" selected={tool === 'saved'} onPress={() => openTool('saved')} />
          <View style={styles.toolbarSpacer} />
          <PositionAction compact label={translate('positions.play_short')} symbol="play" testID="position-play" primary inline selected={tool === 'play'} disabled={!!invalid || finished} onPress={() => openTool('play')} />
        </View>
        {tool === 'play' && (
          <View style={styles.detailPanel}>
            <View style={styles.segmented}>
              <PositionAction segment label={translate('positions.pass_play')} symbol="users" selected={mode === 'vs-human'} onPress={() => setMode('vs-human')} />
              <PositionAction segment label={translate('positions.computer')} symbol="cpu" selected={mode === 'vs-computer'} onPress={() => setMode('vs-computer')} />
            </View>
            <Text style={styles.caption}>{translate('positions.play_hint')}</Text>
            <PositionAction label={translate('positions.play')} symbol="play" testID="position-start" primary disabled={!!invalid || finished} onPress={play} />
          </View>
        )}
        <PositionExchange open={tool === 'exchange'} position={position} onImport={replace} />
        {tool === 'saved' && (
          <PositionSaved
            position={position}
            valid={!invalid}
            saved={saved}
            onSaved={setSaved}
            onOpen={entry => replace(entry.position)}
          />
        )}
      </ScrollView>
    </>
  );
}
