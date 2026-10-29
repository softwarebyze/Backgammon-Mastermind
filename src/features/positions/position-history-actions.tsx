import { View } from 'react-native';
import { HeaderIcon } from '@/components/navigation/game-header-actions';
import { translate, useLayoutIsRTL } from '@/lib/i18n';

/** Undo/redo for board edits, in the same header slots the game screen uses. */
export function PositionHistoryActions({ canUndo, canRedo, onUndo, onRedo }: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void }) {
  const rtl = useLayoutIsRTL();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <HeaderIcon name={rtl ? 'corner-up-right' : 'corner-up-left'} label={translate('positions.undo')} testID="position-undo" disabled={!canUndo} onPress={onUndo} />
      <HeaderIcon name={rtl ? 'corner-up-left' : 'corner-up-right'} label={translate('positions.redo')} testID="position-redo" disabled={!canRedo} onPress={onRedo} />
    </View>
  );
}
