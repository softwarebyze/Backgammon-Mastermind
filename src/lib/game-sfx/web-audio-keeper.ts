type KeptAudioContext = {
  state: string;
  resume: () => Promise<void>;
  close?: () => Promise<void>;
};

/**
 * Holds the page's one AudioContext and brings it back after the app was in
 * the background. iOS Safari leaves a backgrounded context "interrupted"
 * (not "suspended"), and sometimes silent even once it reports "running", so
 * after the page was hidden the next user gesture swaps in a fresh context.
 * Decoded AudioBuffers are not tied to a context and keep working.
 */
export function createWebAudioKeeper<C extends KeptAudioContext>(create: () => C | null) {
  let ctx: C | null = null;
  let stale = false;
  return {
    get(): C | null {
      ctx ??= create();
      return ctx;
    },
    /** The page went to the background. */
    markHidden(): void {
      stale = true;
    },
    /** Call from a user gesture: browsers only start audio inside one. */
    wake(): C | null {
      if (stale && ctx) {
        void ctx.close?.().catch(() => {});
        ctx = null;
      }
      stale = false;
      const current = this.get();
      if (current && current.state !== 'running')
        void current.resume().catch(() => {});
      return current;
    },
    reset(): void {
      ctx = null;
      stale = false;
    },
  };
}
