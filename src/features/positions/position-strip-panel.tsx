import type { ReactNode } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { styles } from './position-styles';

/** Shared frame for every strip editor: a title row with Done, then the controls. */
export function StripPanel({ title, icon, accessory, onDone, children, testID }: {
  title: string;
  icon?: ReactNode;
  /** Secondary action beside Done, e.g. Roll later. */
  accessory?: ReactNode;
  onDone: () => void;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.stripPanel}>
      <View style={styles.stripHeading}>
        {icon}
        <Text accessibilityRole="header" numberOfLines={1} style={styles.stripTitle}>{title}</Text>
        {accessory}
        <Pressable
          testID="position-detail-done"
          accessibilityRole="button"
          accessibilityLabel={translate('positions.done')}
          hitSlop={6}
          onPress={onDone}
          style={({ pressed }) => [styles.stripDone, pressed && styles.pressed]}
        >
          <Feather name="check" size={18} color={GAME_PALETTE.controlInk} accessible={false} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}
