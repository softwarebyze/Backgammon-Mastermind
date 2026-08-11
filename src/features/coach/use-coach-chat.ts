import type { CoachIntent, CoachMessage } from '@/lib/coach';
import type { GameState } from '@/lib/game';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { appendHeuristicReply, runWebLlmTurn } from '@/features/coach/coach-chat-actions';
import { coachWelcome } from '@/lib/coach/respond';
import {
  checkWebLlmSupported,
  getWebLlmModelId,
  isWebLlmSupported,
  subscribeWebLlmProgress,
} from '@/lib/coach/webllm-engine';

let messageSeq = 0;
function nextId(prefix: string): string {
  messageSeq += 1;
  return `${prefix}-${messageSeq}`;
}

function webWelcomeText(llmReady: boolean | null): string {
  if (Platform.OS !== 'web') {
    return coachWelcome().text;
  }
  if (llmReady === false || (llmReady === null && !isWebLlmSupported())) {
    return 'WebLLM needs WebGPU (Chrome/Edge with a GPU). Using the simple rules coach for now.';
  }
  if (llmReady === null) {
    return 'Checking WebGPU for local WebLLM…';
  }
  return `Local WebLLM coach (POC) — model ${getWebLlmModelId()}. First reply downloads the model in your browser (free, no API). Ask about this position or tap a chip.`;
}

export function useCoachChat(state: GameState | null) {
  const instanceId = useId();
  const [llmReady, setLlmReady] = useState<boolean | null>(Platform.OS === 'web' ? null : false);
  const useLlm = Platform.OS === 'web' && llmReady === true;
  const [messages, setMessages] = useState<CoachMessage[]>(() => [{
    id: `${instanceId}-welcome`,
    role: 'coach',
    text: webWelcomeText(Platform.OS === 'web' ? null : false),
    intent: 'welcome',
  }]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [busy, setBusy] = useState(false);
  const [loadProgress, setLoadProgress] = useState<{ text: string; progress: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    let cancelled = false;
    void checkWebLlmSupported().then((ok) => {
      if (cancelled) {
        return;
      }
      setLlmReady(ok);
      setMessages(prev => (
        prev.length === 1 && prev[0]?.intent === 'welcome'
          ? [{ ...prev[0]!, text: webWelcomeText(ok) }]
          : prev
      ));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!useLlm) {
      return;
    }
    return subscribeWebLlmProgress((p) => {
      setLoadProgress(p.progress >= 1 ? null : p);
    });
  }, [useLlm]);

  const askWithLlm = useCallback(async (userText: string) => {
    if (!state) {
      return;
    }
    setBusy(true);
    setError(null);
    const coachId = nextId('coach');
    const prior = messagesRef.current;
    setMessages(prev => [
      ...prev,
      { id: nextId('user'), role: 'user', text: userText },
      { id: coachId, role: 'coach', text: 'Thinking…' },
    ]);
    try {
      await runWebLlmTurn({ state, userText, prior, coachId, setMessages, setError });
    }
    finally {
      setBusy(false);
      setLoadProgress(null);
    }
  }, [state]);

  const askIntent = useCallback((intent: CoachIntent, userLabel: string) => {
    if (!state) {
      return;
    }
    if (useLlm) {
      void askWithLlm(userLabel);
      return;
    }
    appendHeuristicReply(state, userLabel, intent, setMessages, nextId);
  }, [askWithLlm, state, useLlm]);

  const askQuestion = useCallback((question: string) => {
    const trimmed = question.trim();
    if (!trimmed || !state) {
      return;
    }
    if (useLlm) {
      void askWithLlm(trimmed);
      return;
    }
    appendHeuristicReply(state, trimmed, undefined, setMessages, nextId);
  }, [askWithLlm, state, useLlm]);

  const resetChat = useCallback(() => {
    setMessages([{
      id: nextId('welcome'),
      role: 'coach',
      text: webWelcomeText(llmReady),
      intent: 'welcome',
    }]);
    setError(null);
  }, [llmReady]);

  return { messages, askIntent, askQuestion, resetChat, busy, loadProgress, error, useLlm };
}
