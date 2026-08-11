/** Native stub — WebLLM runs in the browser only. */

export type WebLlmProgress = {
  text: string;
  progress: number;
};

export function isWebLlmSupported(): boolean {
  return false;
}

export async function checkWebLlmSupported(): Promise<boolean> {
  return false;
}

export function subscribeWebLlmProgress(_listener: (p: WebLlmProgress) => void): () => void {
  return () => {};
}

export async function ensureWebLlmEngine(): Promise<void> {
  throw new Error('WebLLM is only available on web');
}

export async function webLlmChat(
  _messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  _onDelta?: (text: string) => void,
): Promise<string> {
  throw new Error('WebLLM is only available on web');
}

export function getWebLlmModelId(): string {
  return '';
}
