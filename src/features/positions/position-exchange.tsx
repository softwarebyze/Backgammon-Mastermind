import type { Position } from '@/lib/positions/position';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { translate } from '@/lib/i18n';
import { exportPosition, importPosition, positionLink } from '@/lib/positions/interchange';
import { exportXgid } from '@/lib/positions/xgid';
import { PositionAction, PositionDisclosure } from './position-controls';
import { positionError } from './position-errors';
import { styles } from './position-styles';
import { sharePosition } from './share-position';

export function PositionExchange({ position, onImport }: { position: Position; onImport: (p: Position) => void }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState(false);
  const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
  const runExport = (format: 'XGID' | 'GNUID' | 'JSON' | 'link') => {
    try {
      setError('');
      setNotice('');
      const value = format === 'link' ? positionLink(position, origin) : format === 'XGID' ? exportXgid(position) : exportPosition(position, format);
      setOutput(value);
      if (format === 'link') {
        void sharePosition(value).then(() => setNotice(translate('positions.shared'))).catch(() => setNotice(translate('positions.copy_hint')));
      }
    }
    catch (err) {
      setError(positionError(err));
      setOutput('');
    }
  };
  return (
    <PositionDisclosure label={translate('positions.exchange')} summary="XGID · GNU ID · JSON" symbol="share-2" testID="position-exchange-toggle" open={toolsOpen} onPress={() => setToolsOpen(!toolsOpen)}>
      <View style={styles.row}>
        <PositionAction symbol="download" label={translate('positions.import')} testID="position-import-toggle" onPress={() => setExpanded(!expanded)} selected={expanded} />
        <PositionAction symbol="share-2" label={translate('positions.share')} testID="position-share" onPress={() => runExport('link')} />
        <PositionAction symbol="upload" label="XGID" onPress={() => runExport('XGID')} testID="position-export-xgid" />
        <PositionAction symbol="upload" label="GNUID" onPress={() => runExport('GNUID')} testID="position-export-gnuid" />
        <PositionAction symbol="upload" label="JSON" onPress={() => runExport('JSON')} />
      </View>
      {expanded && (
        <>
          <Text style={styles.caption}>{translate('positions.import_hint')}</Text>
          <TextInput testID="position-import-input" accessibilityLabel={translate('positions.import')} placeholder="XGID=… / GNUID / JSON / https://…" placeholderTextColor="#CBB8A7" multiline autoCapitalize="none" autoCorrect={false} value={input} onChangeText={setInput} style={[styles.input, { minHeight: 96 }]} />
          <PositionAction
            symbol="download"
            label={translate('positions.load')}
            testID="position-import-load"
            onPress={() => {
              try {
                const p = importPosition(input);
                onImport(p);
                setError('');
                setOutput('');
                setNotice(translate('positions.loaded'));
              }
              catch (err) { setError(positionError(err)); }
            }}
          />
        </>
      )}
      {!!output && (
        <View style={{ gap: 8 }}>
          <Text style={styles.caption}>{translate('positions.copy_hint')}</Text>
          <PositionAction
            symbol="copy"
            label={translate('positions.copy')}
            testID="position-copy"
            onPress={() => {
              void Clipboard.setStringAsync(output).then(() => setNotice(translate('positions.copied'))).catch(() => setNotice(translate('positions.copy_hint')));
            }}
          />
          <TextInput testID="position-export-output" accessibilityLabel={translate('positions.export_output')} multiline readOnly selectTextOnFocus value={output} style={[styles.input, { maxHeight: 160 }]} />
        </View>
      )}
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.caption}>{notice}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </PositionDisclosure>
  );
}
