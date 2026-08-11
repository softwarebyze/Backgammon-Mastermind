/**
 * Browser WebLLM engine (Expo web).
 * Metro resolves this file as `webllm-engine.web.ts` on web builds.
 */

import type { ChatCompletionMessageParam, MLCEngineInterface } from '@mlc-ai/web-llm';

export type WebLlmProgress = {
  text: string;
  progress: number;
};

/** Small instruct model — faster first download for the POC. */
export const WEBLLM_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

let enginePromise: Promise<MLCEngineInterface> | null = null;
const progressListeners = new Set<(p: WebLlmProgress) => void>();

export function isWebLlmSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export function getWebLlmModelId(): string {
  return WEBLLM_MODEL_ID;
}

export function subscribeWebLlmProgress(listener: (p: WebLlmProgress) => void): () => void {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

function emitProgress(p: WebLlmProgress) {
  for (const listener of progressListeners) {
    listener(p);
  }
}

export async function ensureWebLlmEngine(): Promise<MLCEngineInterface> {
  if (!isWebLlmSupported()) {
    throw new Error('WebGPU is required for WebLLM. Try Chrome/Edge on desktop, or enable WebGPU.');
  }
  if (!enginePromise) {
    enginePromise = (async () => {
      emitProgress({ text: 'Downloading local model…', progress: 0 });
      const webllm = await import('@mlc-ai/web-llm');
      const engine = await webllm.CreateMLCEngine(WEBLLM_MODEL_ID, {
        initProgressCallback: (report) => {
          emitProgress({
            text: report.text || 'Loading model…',
            progress: report.progress ?? 0,
          });
        },
      });
      emitProgress({ text: 'Model ready', progress: 1 });
      return engine;
    })().catch((error) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

export async function webLlmChat(
  messages: ChatCompletionMessageParam[],
  onDelta?: (text: string) => void,
): Promise<string> {
  const engine = await ensureWebLlmEngine();
  const stream = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 420,
  });

  let full = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (!delta) {
      continue;
    }
    full += delta;
    onDelta?.(full);
  }
  return full.trim() || 'I could not generate a reply. Try asking again.';
}
