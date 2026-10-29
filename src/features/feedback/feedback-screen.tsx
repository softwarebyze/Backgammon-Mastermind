import Feather from '@expo/vector-icons/Feather';
import Env from 'env';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { FocusAwareStatusBar } from '@/components/ui';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { APP_LINKS, openExternalUrl } from '@/lib/app-links';
import { hapticLight } from '@/lib/haptics';
import { translate, useSelectedLanguage } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { SETTINGS_MAX_WIDTH } from '@/lib/ui/game-chrome';
import { contentEdgePadding, useLayoutMetrics } from '@/lib/ui/layout-metrics';
import { continuousRadius } from '@/lib/ui/native-styles';
import { WEB_SETTINGS_TOP_PADDING } from '@/lib/ui/web-layout';
import { canSendFeedback, feedbackMailUrl } from './feedback-mail';

function LabeledInput({
  id,
  label,
  placeholder,
  value,
  onChangeText,
  maxLength,
  multiline = false,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLength: number;
  multiline?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <>
      <Text style={styles.label} nativeID={`${id}-label`}>{label}</Text>
      <TextInput
        testID={id}
        accessibilityLabelledBy={`${id}-label`}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(232, 224, 208, 0.35)"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, multiline && styles.multiline, focused && styles.inputFocused]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        maxLength={maxLength}
      />
    </>
  );
}

export function FeedbackScreen() {
  const posthog = usePostHog();
  const { insets } = useLayoutMetrics();
  const { width, height } = useWindowDimensions();
  const { language } = useSelectedLanguage();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const ready = canSendFeedback(title, details);

  const send = async () => {
    if (!ready) {
      return;
    }
    hapticLight();
    // The note also lands in analytics, next to the session that produced it.
    posthog.capture('feedback_submitted', {
      title: title.trim(),
      details: details.trim(),
    });
    try {
      await openExternalUrl(feedbackMailUrl(title, details, {
        appName: Env.EXPO_PUBLIC_NAME,
        version: Env.EXPO_PUBLIC_VERSION,
        platform: Platform.OS,
        osVersion: String(Platform.Version ?? ''),
        language: language ?? 'en',
        screen: { width, height },
      }));
      showMessage({ message: translate('feedback.sent'), type: 'success' });
      router.back();
    }
    catch {
      showMessage({
        message: translate('feedback.error', { email: APP_LINKS.supportEmail }),
        type: 'warning',
        duration: 6000,
      });
    }
  };

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        testID="feedback-screen"
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          Platform.OS === 'web' ? { paddingTop: WEB_SETTINGS_TOP_PADDING } : undefined,
          contentEdgePadding(insets, { left: 16, right: 16, bottom: 32 }),
        ]}
      >
        <View style={styles.page}>
          <Text style={styles.intro}>{translate('feedback.intro')}</Text>

          <LabeledInput
            id="feedback-title"
            label={translate('feedback.subject_label')}
            placeholder={translate('feedback.subject_placeholder')}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <LabeledInput
            id="feedback-details"
            label={translate('feedback.body_label')}
            placeholder={translate('feedback.body_placeholder')}
            value={details}
            onChangeText={setDetails}
            maxLength={4000}
            multiline
          />

          <View style={styles.hintRow}>
            <Feather name="paperclip" size={14} color={GAME_PALETTE.textMuted} />
            <Text style={styles.hint}>{translate('feedback.attach_hint')}</Text>
          </View>

          <HoverPressable
            accessibilityRole="button"
            accessibilityLabel={translate('feedback.send')}
            accessibilityState={{ disabled: !ready }}
            disabled={!ready}
            testID="feedback-send"
            onPress={() => void send()}
            style={({ pressed, hovered }) => [
              styles.send,
              !ready && styles.sendDisabled,
              ready && hovered && styles.sendHover,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="send" size={18} color={GAME_PALETTE.controlInk} />
            <Text style={styles.sendText}>{translate('feedback.send')}</Text>
          </HoverPressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: GAME_PALETTE.bg,
  },
  page: {
    width: '100%',
    maxWidth: SETTINGS_MAX_WIDTH,
    alignSelf: 'center',
    gap: 8,
    paddingTop: 8,
  },
  intro: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    ...interFont('regular'),
  },
  label: {
    marginTop: 8,
    color: GAME_PALETTE.accentDim,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    ...interFont('semibold'),
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: GAME_PALETTE.text,
    fontSize: 16,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...interFont('regular'),
    ...continuousRadius(12),
  },
  multiline: {
    minHeight: 160,
  },
  inputFocused: {
    borderColor: GAME_PALETTE.accent,
    // Web: the orange border is the focus ring; drop the browser's white outline.
    outlineWidth: 0,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  hint: {
    flex: 1,
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    ...interFont('regular'),
  },
  send: {
    marginTop: 16,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GAME_PALETTE.control,
    borderWidth: 1.5,
    borderColor: GAME_PALETTE.controlBorder,
    ...continuousRadius(12),
  },
  sendHover: {
    backgroundColor: GAME_PALETTE.controlHover,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  sendText: {
    color: GAME_PALETTE.controlInk,
    fontSize: 16,
    ...interFont('semibold'),
  },
});
