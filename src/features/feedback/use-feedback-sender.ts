import type { RefObject } from 'react';
import Env from 'env';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { Platform, useWindowDimensions } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { APP_LINKS, openExternalUrl } from '@/lib/app-links';
import { hapticLight } from '@/lib/haptics';
import { translate, useSelectedLanguage } from '@/lib/i18n';
import { feedbackEvent } from './feedback-event';
import { feedbackMailUrl } from './feedback-mail';

/**
 * Send goes to PostHog (straight to the developer, no mail app). Email stays
 * available for attaching a screenshot, and is the fallback when analytics is
 * off (no project token).
 */
export function useFeedbackSender({ title, details, ready, setSending, inFlight }: {
  title: string;
  details: string;
  ready: boolean;
  setSending: (sending: boolean) => void;
  inFlight: RefObject<boolean>;
}) {
  const posthog = usePostHog();
  const { width, height } = useWindowDimensions();
  const { language } = useSelectedLanguage();
  const context = () => ({
    appName: Env.EXPO_PUBLIC_NAME,
    version: Env.EXPO_PUBLIC_VERSION,
    platform: Platform.OS,
    osVersion: String(Platform.Version ?? ''),
    language: language ?? 'en',
    screen: { width, height },
  });

  const sendByEmail = async () => {
    try {
      await openExternalUrl(feedbackMailUrl(title, details, context()));
    }
    catch {
      showMessage({ message: translate('feedback.error', { email: APP_LINKS.supportEmail }), type: 'warning', duration: 6000 });
    }
  };

  const send = async () => {
    // A ref, not state: a fast double tap lands before the re-render disables Send.
    if (!ready || inFlight.current) {
      return;
    }
    inFlight.current = true;
    setSending(true);
    hapticLight();
    try {
      if (posthog.isDisabled || posthog.optedOut) {
        await sendByEmail();
        return;
      }
      const { event, properties } = feedbackEvent({ title, details }, context());
      posthog.capture(event, properties);
      // Deliver now rather than with the next batch, so a closed app doesn't lose it.
      await posthog.flush().catch(() => {});
      showMessage({ message: translate('feedback.sent'), type: 'success' });
      router.back();
    }
    finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  return { send, sendByEmail };
}
