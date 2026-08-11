import type { CoachIntent, CoachMessage } from '@/lib/coach';
import type { GameState } from '@/lib/game';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { buildCoachSystemPrompt } from '@/lib/coach/build-context';
import { coachRespond, coachWelcome } from '@/lib/coach/respond';
import {
  ensureWebLlmEngine,
  getWebLlmModelId,
  isWebLlmSupported,
  subscribeWebLlmProgress,
  webLlmChat,
} from '@/lib/coach/webllm-engine';

let messageSeq = 0;
function nextId(prefix: string): string {
  messageSeq += 1;
  return `${prefix}-${messageSeq}`;
}

function webWelcomeText(): string {
  if (Platform.OS !== 'web') {
    return coachWelcome().text;
  }
  if (!isWebLlmSupported()) {
    return 'WebLLM needs WebGPU (Chrome/Edge desktop works best). Falling back to the simple rules coach for now.';
  }
  return `Local WebLLM coach (POC) — model ${getWebLlmModelId()}. First reply downloads the model in your browser (free, no API). Ask about this position or tap a chip.`;
}

async function runWebLlmTurn(opts: {
  state: GameState;
  userText: string;
  prior: CoachMessage[];
  coachId: string;
  setMessages: React.Dispatch<React.SetStateAction<CoachMessage[]>>;
  setError: (value: string | null) => void;
}) {
  const { state, userText, prior, coachId, setMessages, setError } = opts;
  try {
    await ensureWebLlmEngine();
    const history = prior
      .filter(m => m.intent !== 'welcome')
      .slice(-8)
      .map(m => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }));

    const reply = await webLlmChat(
      [
        { role: 'system', content: buildCoachSystemPrompt(state) },
        ...history,
        { role: 'user', content: userText },
      ],
      (partial) => {
        setMessages(prev => prev.map(m => (m.id === coachId ? { ...m, text: partial } : m)));
      },
    );
    setMessages(prev => prev.map(m => (m.id === coachId ? { ...m, text: reply } : m)));
  }
  catch (e) {
    const message = e instanceof Error ? e.message : 'WebLLM failed';
    setError(message);
    const fallback = coachRespond(state, { question: userText });
    setMessages(prev => prev.map(m => (
      m.id === coachId
        ? { ...m, text: `${fallback.text}\n\n(WebLLM unavailable: ${message})`, intent: fallback.intent }
        : m
    )));
  }
}

export function useCoachChat(state: GameState | null) {
  const instanceId = useId();
  const useLlm = Platform.OS === 'web' && isWebLlmSupported();
  const [messages, setMessages] = useState<CoachMessage[]>(() => [{
    id: `${instanceId}-welcome`,
    role: 'coach',
    text: webWelcomeText(),
    intent: 'welcome',
  }]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const [busy, setBusy] = useState(false);
  const [loadProgress, setLoadProgress] = useState<{ text: string; progress: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const reply = coachRespond(state, { intent });
    setMessages(prev => [
      ...prev,
      { id: nextId('user'), role: 'user', text: userLabel },
      { id: nextId('coach'), role: 'coach', text: reply.text, intent: reply.intent },
    ]);
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
    const reply = coachRespond(state, { question: trimmed });
    setMessages(prev => [
      ...prev,
      { id: nextId('user'), role: 'user', text: trimmed },
      { id: nextId('coach'), role: 'coach', text: reply.text, intent: reply.intent },
    ]);
  }, [askWithLlm, state, useLlm]);

  const resetChat = useCallback(() => {
    setMessages([{
      id: nextId('welcome'),
      role: 'coach',
      text: webWelcomeText(),
      intent: 'welcome',
    }]);
    setError(null);
  }, []);

  return {
    messages,
    askIntent,
    askQuestion,
    resetChat,
    busy,
    loadProgress,
    error,
    useLlm,
  };
}
