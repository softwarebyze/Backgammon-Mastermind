import type { Position } from '@/lib/positions/position';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { translate } from '@/lib/i18n';
import { exportPosition, importPosition, positionLink } from '@/lib/positions/interchange';
import { PositionFormatError } from '@/lib/positions/position';
import { exportXgid } from '@/lib/positions/xgid';
import { PositionAction, PositionSection, styles } from './position-controls';
import { sharePosition } from './share-position';

export function positionError(error: unknown): string {
  const code = error instanceof PositionFormatError ? error.code : 'format';
  return translate(`positions.error_${code}`);
}

export function PositionExchange({ position, onImport }: { position: Position; onImport: (p: Position) => void }) {
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
    <PositionSection title={translate('positions.exchange')}>
      <View style={styles.row}>
        <PositionAction label={translate('positions.import')} testID="position-import-toggle" onPress={() => setExpanded(!expanded)} selected={expanded} />
        <PositionAction label={translate('positions.share')} testID="position-share" onPress={() => runExport('link')} />
        <PositionAction label="XGID" onPress={() => runExport('XGID')} testID="position-export-xgid" />
        <PositionAction label="GNUID" onPress={() => runExport('GNUID')} testID="position-export-gnuid" />
        <PositionAction label="JSON" onPress={() => runExport('JSON')} />
      </View>
      {expanded && (
        <>
          <Text style={styles.caption}>{translate('positions.import_hint')}</Text>
          <TextInput testID="position-import-input" accessibilityLabel={translate('positions.import')} placeholder="XGID=… / GNUID / JSON / https://…" placeholderTextColor="#CBB8A7" multiline autoCapitalize="none" autoCorrect={false} value={input} onChangeText={setInput} style={[styles.input, { minHeight: 96 }]} />
          <PositionAction
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
    </PositionSection>
  );
}
