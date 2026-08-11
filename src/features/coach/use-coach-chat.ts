import type { CoachIntent, CoachMessage } from '@/lib/coach';
import type { GameState } from '@/lib/game';
import { useCallback, useId, useState } from 'react';

import { coachRespond, coachWelcome } from '@/lib/coach';

let messageSeq = 0;
function nextId(prefix: string): string {
  messageSeq += 1;
  return `${prefix}-${messageSeq}`;
}

export function useCoachChat(state: GameState | null) {
  const instanceId = useId();
  const [messages, setMessages] = useState<CoachMessage[]>(() => {
    const welcome = coachWelcome();
    return [{
      id: `${instanceId}-welcome`,
      role: 'coach',
      text: welcome.text,
      intent: welcome.intent,
    }];
  });

  const askIntent = useCallback((intent: CoachIntent, userLabel: string) => {
    if (!state) {
      return;
    }
    const reply = coachRespond(state, { intent });
    setMessages(prev => [
      ...prev,
      { id: nextId('user'), role: 'user', text: userLabel },
      { id: nextId('coach'), role: 'coach', text: reply.text, intent: reply.intent },
    ]);
  }, [state]);

  const askQuestion = useCallback((question: string) => {
    const trimmed = question.trim();
    if (!trimmed || !state) {
      return;
    }
    const reply = coachRespond(state, { question: trimmed });
    setMessages(prev => [
      ...prev,
      { id: nextId('user'), role: 'user', text: trimmed },
      { id: nextId('coach'), role: 'coach', text: reply.text, intent: reply.intent },
    ]);
  }, [state]);

  const resetChat = useCallback(() => {
    const welcome = coachWelcome();
    setMessages([{
      id: nextId('welcome'),
      role: 'coach',
      text: welcome.text,
      intent: welcome.intent,
    }]);
  }, []);

  return { messages, askIntent, askQuestion, resetChat };
}
