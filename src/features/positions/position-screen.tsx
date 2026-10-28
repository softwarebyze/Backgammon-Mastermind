import type { Position, PositionLocation } from '@/lib/positions/position';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { FocusAwareStatusBar } from '@/components/ui';
import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { requestReplaceActiveGame } from '@/features/game/request-new-game';
import { useGame } from '@/features/game/use-game';
import { translate } from '@/lib/i18n';
import { newPosition, positionFromGame, positionGame, validatePosition } from '@/lib/positions/position';
import { deleteSavedPosition, loadSavedPositions, savePosition } from '@/lib/positions/saved-positions';
import { contentEdgePadding, useLayoutMetrics } from '@/lib/ui/layout-metrics';
import { WEB_SETTINGS_TOP_PADDING } from '@/lib/ui/web-layout';
import { PositionBoardEditor } from './position-board-editor';
import { PositionAction, PositionDisclosure } from './position-controls';
import { PositionDetails } from './position-details';
import { positionError } from './position-errors';
import { PositionExchange } from './position-exchange';
import { styles } from './position-styles';
import { StandardSetupIcon } from './standard-setup-icon';

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

export function PositionScreen() {
  const { data } = useLocalSearchParams<{ data?: string }>();
  // Key the workspace by URL so a second shared link is never ignored on native.
  return <PositionWorkspace key={data ?? 'editor'} data={data} />;
}

/* eslint-disable max-lines-per-function -- one workspace composes the board and tools */
function PositionWorkspace({ data }: { data?: string }) {
  const { state, startFromPosition } = useGame();
  const [initial] = useState(() => initialPosition(data));
  const [position, setPosition] = useState(initial.position);
  const [error, setError] = useState(initial.error);
  const [location, setLocation] = useState<PositionLocation | null>(null);
  const [saved, setSaved] = useState(loadSavedPositions);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const [savedOpen, setSavedOpen] = useState(false);
  const [mode, setMode] = useState<'vs-human' | 'vs-computer'>('vs-human');
  const { width } = useWindowDimensions();
  const { insets } = useLayoutMetrics();
  const dims = fitBoardToViewport(Math.min(880, Math.max(200, width - 32 - insets.left - insets.right)), width < 600 ? 310 : 470, { extraHeight: 36, checkerCap: 48 });
  const change = (p: Position) => {
    setPosition(p);
    setError('');
    setNotice('');
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
  let validationError = '';
  let valid = true;
  try {
    validatePosition(position);
  }
  catch (err) {
    valid = false;
    validationError = positionError(err);
  }
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
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: WEB_SETTINGS_TOP_PADDING }, contentEdgePadding(insets, { left: 16, right: 16, bottom: 32 })]}
      >
        {!!data && <Text style={styles.caption}>{translate('positions.shared_intro')}</Text>}
        <View style={[styles.row, { width: dims.boardOuterWidth, alignSelf: 'center' }]}>
          <PositionAction
            label={translate('positions.standard')}
            testID="position-standard"
            compact
            icon={<StandardSetupIcon />}
            onPress={() => {
              change(newPosition());
              setLocation(null);
            }}
          />
          <PositionAction
            label={translate('positions.empty')}
            testID="position-empty"
            compact
            symbol="trash-2"
            onPress={() => {
              change(newPosition(true));
              setLocation(null);
            }}
          />

        </View>
        <PositionBoardEditor position={position} dimensions={dims} location={location} onLocation={setLocation} onChange={change} />
        <PositionDetails position={position} onChange={change} />
        {!!error && <Text accessibilityRole="alert" testID="position-error" style={styles.error}>{error}</Text>}
        <View style={styles.playPanel}>
          <View style={styles.row}>
            <PositionAction label={translate('positions.pass_play')} symbol="users" selected={mode === 'vs-human'} onPress={() => setMode('vs-human')} />
            <PositionAction label={translate('positions.computer')} symbol="cpu" selected={mode === 'vs-computer'} onPress={() => setMode('vs-computer')} />
          </View>
          <PositionAction label={translate('positions.play')} symbol="play" testID="position-play" primary disabled={!valid || position.borneOff.white === 15 || position.borneOff.black === 15} onPress={play} />
          <Text style={styles.caption}>{translate('positions.play_hint')}</Text>
        </View>
        <View style={styles.toolList}>
          <PositionExchange
            position={position}
            onCurrent={state
              ? () => {
                  change(positionFromGame(state));
                  setLocation(null);
                  setNotice(translate('positions.snapshot_hint'));
                }
              : undefined}
            onImport={(p) => {
              change(p);
              setLocation(null);
            }}
          />
          <PositionDisclosure label={translate('positions.saved')} summary={translate('positions.saved_summary', { count: saved.length })} symbol="bookmark" testID="position-saved-toggle" open={savedOpen} onPress={() => setSavedOpen(!savedOpen)}>
            <Text style={styles.caption}>{translate('positions.saved_hint')}</Text>
            <TextInput testID="position-save-name" accessibilityLabel={translate('positions.name')} placeholder={translate('positions.name')} placeholderTextColor="#CBB8A7" value={name} maxLength={80} onChangeText={setName} style={styles.input} />
            <PositionAction
              label={translate('positions.save')}
              symbol="bookmark"
              testID="position-save"
              disabled={!valid}
              onPress={() => {
                try {
                  setSaved(savePosition(name.trim() || translate('positions.untitled'), position));
                  setNotice(translate('positions.saved_notice'));
                }
                catch (err) { setError(positionError(err)); }
              }}
            />
            {!saved.length && <Text style={styles.caption}>{translate('positions.no_saved')}</Text>}
            {saved.map(entry => (
              <View style={styles.savedRow} key={entry.id}>
                <PositionAction
                  label={entry.name}
                  onPress={() => {
                    change(entry.position);
                    setLocation(null);
                    setName(entry.name);
                  }}
                />
                <PositionAction symbol="trash-2" label={translate('positions.delete')} onPress={() => setSaved(deleteSavedPosition(entry.id))} />
              </View>
            ))}
          </PositionDisclosure>
        </View>
        {!valid && <Text accessibilityRole="alert" style={styles.error}>{validationError}</Text>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={styles.caption}>{notice}</Text>}
      </ScrollView>
    </>
  );
}
