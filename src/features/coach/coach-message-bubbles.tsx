import type { CoachMessage } from '@/lib/coach';
import { StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

export function CoachMessageBubbles({ messages }: { messages: CoachMessage[] }) {
  return (
    <>
      {messages.map(msg => (
        <View
          key={msg.id}
          style={[
            styles.bubble,
            msg.role === 'user' ? styles.bubbleUser : styles.bubbleCoach,
          ]}
        >
          <Text style={msg.role === 'user' ? styles.bubbleUserText : styles.bubbleCoachText}>
            {msg.text}
          </Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '92%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...continuousRadius(14),
  },
  bubbleCoach: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GAME_PALETTE.surfaceBorder,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: GAME_PALETTE.control,
  },
  bubbleCoachText: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    lineHeight: 20,
    ...interFont('regular'),
  },
  bubbleUserText: {
    color: '#FFF8EE',
    fontSize: 14,
    lineHeight: 20,
    ...interFont('medium'),
  },
});
