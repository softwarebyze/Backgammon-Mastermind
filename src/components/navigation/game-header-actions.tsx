import { Feather } from '@expo/vector-icons';
import { HeaderButton } from 'expo-router/react-navigation';
import { Platform, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';

type Props = {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onOptions: () => void;
  onReset: () => void;
};

const ICON = Platform.OS === 'web' ? 22 : 20;
const GAP = Platform.OS === 'web' ? 4 : 0;

/** Always reserve undo+redo slots so the header never layout-shifts. */
export function GameHeaderActions({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onOptions,
  onReset,
}: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: GAP }}>
      <HeaderButton
        accessibilityLabel="Undo move"
        disabled={!canUndo || !onUndo}
        onPress={() => {
          if (!canUndo || !onUndo) {
            return;
          }
          hapticLight();
          onUndo();
        }}
      >
        <Feather
          name="corner-up-left"
          size={ICON}
          color={canUndo ? GAME_PALETTE.accent : GAME_PALETTE.accentDim}
          style={{ opacity: canUndo ? 1 : 0.35 }}
        />
      </HeaderButton>
      <HeaderButton
        accessibilityLabel="Redo move"
        disabled={!canRedo || !onRedo}
        onPress={() => {
          if (!canRedo || !onRedo) {
            return;
          }
          hapticLight();
          onRedo();
        }}
      >
        <Feather
          name="corner-up-right"
          size={ICON}
          color={canRedo ? GAME_PALETTE.accent : GAME_PALETTE.accentDim}
          style={{ opacity: canRedo ? 1 : 0.35 }}
        />
      </HeaderButton>
      <HeaderButton
        accessibilityLabel={translate('game.options.title')}
        onPress={() => {
          hapticLight();
          onOptions();
        }}
      >
        <Feather name="sliders" size={ICON} color={GAME_PALETTE.accent} />
      </HeaderButton>
      <HeaderButton
        accessibilityLabel="Start new game"
        onPress={() => {
          hapticLight();
          onReset();
        }}
      >
        <Feather name="refresh-cw" size={ICON} color={GAME_PALETTE.accentDim} />
      </HeaderButton>
    </View>
  );
}
