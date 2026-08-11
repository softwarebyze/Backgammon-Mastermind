import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { GameState } from '@/lib/game';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Modal } from '@/components/ui';
import { CoachMessageBubbles } from '@/features/coach/coach-message-bubbles';
import { useCoachChat } from '@/features/coach/use-coach-chat';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { COACH_SUGGESTED_PROMPTS } from '@/lib/coach';
import { hapticLight } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

const MessageScroll = Platform.OS === 'web' ? ScrollView : BottomSheetScrollView;
const CoachInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

type Props = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  state: GameState | null;
};

/** English-only POC — WebLLM on web, heuristic elsewhere. */
export function CoachSheet({ sheetRef, state }: Props) {
  const { messages, askIntent, askQuestion, busy, loadProgress, error, useLlm } = useCoachChat(state);
  const [draft, setDraft] = useState('');

  const sendDraft = useCallback(() => {
    const text = draft.trim();
    if (!text || busy) {
      return;
    }
    hapticLight();
    askQuestion(text);
    setDraft('');
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, [askQuestion, busy, draft]);

  return (
    <Modal
      ref={sheetRef}
      snapPoints={['78%']}
      title="Coach (POC)"
      headerTheme="game"
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior={Platform.OS === 'ios' ? 'extend' : 'interactive'}
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enablePanDownToClose
    >
      <View style={styles.body}>
        <Text style={styles.subtitle}>
          {useLlm ? 'WebLLM in your browser — free, no API fees' : 'Free on-device prototype — no API, no fees'}
        </Text>
        {loadProgress
          ? (
              <View style={styles.progressRow}>
                <ActivityIndicator color={GAME_PALETTE.accent} />
                <Text style={styles.progressText}>
                  {loadProgress.text}
                  {loadProgress.progress > 0 ? ` (${Math.round(loadProgress.progress * 100)}%)` : ''}
                </Text>
              </View>
            )
          : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <MessageScroll style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <CoachMessageBubbles messages={messages} />
        </MessageScroll>

        <View style={styles.prompts}>
          {COACH_SUGGESTED_PROMPTS.map(prompt => (
            <Pressable
              key={prompt.id}
              accessibilityRole="button"
              disabled={busy}
              style={({ pressed }) => [styles.chip, busy && styles.sendDisabled, pressed && styles.pressed]}
              onPress={() => {
                hapticLight();
                askIntent(prompt.id, prompt.label);
              }}
            >
              <Text style={styles.chipText}>{prompt.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.composer}>
          <CoachInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about this position…"
            placeholderTextColor={GAME_PALETTE.textMuted}
            style={styles.input}
            returnKeyType="send"
            editable={!busy}
            onSubmitEditing={sendDraft}
            testID="coach-input"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={({ pressed }) => [
              styles.sendBtn,
              (!draft.trim() || !state || busy) && styles.sendDisabled,
              pressed && styles.pressed,
            ]}
            disabled={!draft.trim() || !state || busy}
            onPress={sendDraft}
            testID="coach-send"
          >
            <Text style={styles.sendText}>{busy ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: GAME_PALETTE.surface },
  handle: { backgroundColor: '#8B5E3C' },
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  progressText: {
    flex: 1,
    color: GAME_PALETTE.accent,
    fontSize: 12,
    ...interFont('medium'),
  },
  errorText: {
    color: '#E8A0A0',
    fontSize: 12,
    marginBottom: 8,
    ...interFont('regular'),
  },
  scroll: { flex: 1 },
  scrollContent: { gap: 10, paddingBottom: 12 },
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
  sendDisabled: { opacity: 0.4 },
  sendText: {
    color: '#FFF8EE',
    fontSize: 14,
    ...interFont('semibold'),
  },
  pressed: { opacity: 0.85 },
});
