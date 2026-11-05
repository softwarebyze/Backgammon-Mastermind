import { APP_LINKS } from '@/lib/app-links';

export type FeedbackContext = {
  appName: string;
  version: string;
  platform: string;
  osVersion: string;
  language: string;
  screen: { width: number; height: number };
};

/** At least a title or some details: an empty note is not worth sending. */
export function canSendFeedback(title: string, details: string): boolean {
  return title.trim().length > 0 || details.trim().length > 0;
}

/**
 * A prefilled mail to support. The device lines at the bottom are what makes a
 * bug report debuggable; the mail app lets the player attach a screenshot.
 */
export function feedbackMailUrl(title: string, details: string, context: FeedbackContext): string {
  const subject = `${context.appName} feedback${title.trim() ? `: ${title.trim()}` : ''}`;
  const body = [
    details.trim(),
    '',
    '—',
    `${context.appName} ${context.version}`,
    `${context.platform} ${context.osVersion}`,
    `Language: ${context.language}`,
    `Screen: ${Math.round(context.screen.width)}×${Math.round(context.screen.height)}`,
  ].join('\n');
  return `mailto:${APP_LINKS.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
