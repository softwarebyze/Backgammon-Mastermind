import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { GameState } from '@/lib/game';
import type { TxKeyPath } from '@/lib/i18n';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useState } from 'react';

import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Modal } from '@/components/ui';
import { useCoachChat } from '@/features/coach/use-coach-chat';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { COACH_SUGGESTED_PROMPTS } from '@/lib/coach';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  state: GameState | null;
};

export function CoachSheet({ sheetRef, state }: Props) {
  const posthog = usePostHog();
  const { messages, askIntent, askQuestion } = useCoachChat(state);
  const [draft, setDraft] = useState('');

  const sendDraft = useCallback(() => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    hapticLight();
    posthog.capture('coach_question_asked', { source: 'text' });
    askQuestion(text);
    setDraft('');
    Keyboard.dismiss();
  }, [askQuestion, draft, posthog]);

  const onPrompt = useCallback((intent: (typeof COACH_SUGGESTED_PROMPTS)[number]['id'], labelKey: TxKeyPath) => {
    hapticLight();
    posthog.capture('coach_question_asked', { source: 'prompt', intent });
    askIntent(intent, translate(labelKey));
  }, [askIntent, posthog]);

  return (
    <Modal
      ref={sheetRef}
      snapPoints={['78%']}
      title={translate('coach.title')}
      headerTheme="game"
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior={Platform.OS === 'ios' ? 'extend' : 'interactive'}
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enablePanDownToClose
    >
      <View style={styles.body}>
        <Text style={styles.subtitle}>{translate('coach.subtitle')}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{translate('coach.free_badge')}</Text>
        </View>

        <BottomSheetScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
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
        </BottomSheetScrollView>

        <View style={styles.prompts}>
          {COACH_SUGGESTED_PROMPTS.map(prompt => (
            <Pressable
              key={prompt.id}
              accessibilityRole="button"
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              onPress={() => onPrompt(prompt.id, prompt.labelKey)}
            >
              <Text style={styles.chipText}>
                {translate(prompt.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.composer}>
          <BottomSheetTextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={translate('coach.placeholder')}
            placeholderTextColor={GAME_PALETTE.textMuted}
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={sendDraft}
            testID="coach-input"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate('coach.send')}
            style={({ pressed }) => [
              styles.sendBtn,
              (!draft.trim() || !state) && styles.sendDisabled,
              pressed && styles.pressed,
            ]}
            disabled={!draft.trim() || !state}
            onPress={sendDraft}
            testID="coach-send"
          >
            <Text style={styles.sendText}>{translate('coach.send')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: GAME_PALETTE.surface,
  },
  handle: {
    backgroundColor: '#8B5E3C',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: Platform.select({ ios: 12, default: 16 }),
  },
  subtitle: {
    textAlign: 'center',
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('medium'),
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    ...continuousRadius(12),
    backgroundColor: 'rgba(255, 196, 153, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GAME_PALETTE.surfaceBorder,
    marginBottom: 12,
  },
  badgeText: {
    color: GAME_PALETTE.accent,
    fontSize: 12,
    ...interFont('semibold'),
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 12,
  },
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
  prompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    ...continuousRadius(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GAME_PALETTE.surfaceBorder,
    backgroundColor: 'rgba(255, 196, 153, 0.08)',
  },
  chipText: {
    color: GAME_PALETTE.accent,
    fontSize: 12,
    ...interFont('medium'),
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 10, default: 8 }),
    ...continuousRadius(12),
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GAME_PALETTE.surfaceBorder,
    color: GAME_PALETTE.text,
    fontSize: 15,
    ...interFont('regular'),
  },
  sendBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    ...continuousRadius(12),
    backgroundColor: GAME_PALETTE.control,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GAME_PALETTE.controlBorder,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#FFF8EE',
    fontSize: 14,
    ...interFont('semibold'),
  },
  pressed: {
    opacity: 0.85,
  },
});
