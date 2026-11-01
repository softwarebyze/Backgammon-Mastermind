import type { LayoutChangeEvent } from 'react-native';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { homeTitleScale } from './home-title-scale';

const TITLE = { fontSize: 32, lineHeight: 38, letterSpacing: 4 };
/** Home's horizontal padding, for the first frame before layout reports. */
const SIDE_PADDING = 24;
const TITLE_LANDSCAPE = { fontSize: 22, lineHeight: 26, letterSpacing: 2 };
/**
 * "BACKGAMMON / MASTERMIND", one word per line. On narrow phones the letters
 * shrink instead of the word breaking ("BACKGAMMO / N"). Sized from layout,
 * not adjustsFontSizeToFit, because web ignores that prop.
 */
export function HomeTitle({ landscape }: { landscape: boolean }) {
  const { width: windowWidth } = useWindowDimensions();
  const [available, setAvailable] = useState<number | null>(null);
  const base = landscape ? TITLE_LANDSCAPE : TITLE;
  const scale = homeTitleScale(available ?? windowWidth - SIDE_PADDING * 2, base.fontSize);
  const onLayout = (e: LayoutChangeEvent) => setAvailable(e.nativeEvent.layout.width);
  return (
    <View testID="home-title" style={styles.box} onLayout={onLayout}>
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          {
            fontSize: base.fontSize * scale,
            lineHeight: base.lineHeight * scale,
            letterSpacing: base.letterSpacing * scale,
          },
        ]}
      >
        {translate('home.title')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', alignItems: 'center' },
  title: {
    color: GAME_PALETTE.accent,
    ...interFont('extrabold'),
    textAlign: 'center',
  },
});
