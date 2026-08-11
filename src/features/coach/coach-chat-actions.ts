import type { CoachIntent, CoachMessage } from '@/lib/coach';
import type { GameState } from '@/lib/game';

import { buildCoachSystemPrompt } from '@/lib/coach/build-context';
import { coachRespond } from '@/lib/coach/respond';
import { ensureWebLlmEngine, webLlmChat } from '@/lib/coach/webllm-engine';

export async function runWebLlmTurn(opts: {
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

export function appendHeuristicReply(
  state: GameState,
  userLabel: string,
  intent: CoachIntent | undefined,
  setMessages: React.Dispatch<React.SetStateAction<CoachMessage[]>>,
  nextId: (prefix: string) => string,
) {
  const reply = intent
    ? coachRespond(state, { intent })
    : coachRespond(state, { question: userLabel });
  setMessages(prev => [
    ...prev,
    { id: nextId('user'), role: 'user', text: userLabel },
    { id: nextId('coach'), role: 'coach', text: reply.text, intent: reply.intent },
  ]);
}
