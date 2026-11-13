/**
 * Startup marker read by CI (`.github/scripts/measure-android-startup.sh`).
 *
 * Android's `am start -W` only measures the native splash's first frame. The
 * moment that matters is when JS has loaded, fonts are ready and the root
 * view has laid out — the same moment we hide the splash. Logging a fixed
 * token there lets CI time "launch → app ready" from logcat timestamps.
 *
 * Keep the token in sync with `STARTUP_MARKER` in that script.
 */
export const STARTUP_READY_MARKER = 'BGM_PERF startup-ready';

let marked = false;

/** Log the startup-ready marker once per JS runtime. */
export function markStartupReady() {
  if (marked) {
    return;
  }
  marked = true;
  console.info(STARTUP_READY_MARKER);
}
