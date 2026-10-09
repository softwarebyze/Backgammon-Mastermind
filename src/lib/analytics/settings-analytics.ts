/**
 * Settings analytics, driven from the single preferences update path so every
 * setting (current and future) is covered without per-screen capture calls.
 *
 * - `setting_changed` fires once per key whose value actually changed.
 * - Every setting is mirrored into PostHog super properties (`pref_<key>`), so
 *   gameplay events such as `game_started` / `game_completed` can be segmented
 *   by the settings in force.
 *
 * Settings are booleans, numbers, or short enum strings. Anything else is
 * dropped so free text can never leak into analytics.
 */
type AnalyticsValue = boolean | number | string | null;

type SettingsAnalyticsSink = {
  capture: (event: string, properties?: Record<string, AnalyticsValue>) => void;
  register: (properties: Record<string, AnalyticsValue>) => void | Promise<void>;
};

type SettingValue = boolean | number | string;

const MAX_STRING_LENGTH = 32;

let sink: SettingsAnalyticsSink | null = null;
let currentScreen = 'unknown';

export function setAnalyticsScreen(screen: string): void {
  currentScreen = screen;
}

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function isSafeValue(value: unknown): value is SettingValue {
  return typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))
    || (typeof value === 'string' && value.length <= MAX_STRING_LENGTH);
}

export function settingProperties(settings: object): Record<string, SettingValue> {
  const out: Record<string, SettingValue> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (isSafeValue(value)) {
      out[`pref_${toSnakeCase(key)}`] = value;
    }
  }
  return out;
}

export function bindSettingsAnalytics(
  next: SettingsAnalyticsSink,
  initialSettings: object,
): void {
  sink = next;
  void sink.register(settingProperties(initialSettings));
}

export function trackSettingsChange(previous: object, next: object): void {
  if (!sink) {
    return;
  }
  const before = previous as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  let changed = false;
  for (const key of Object.keys(after)) {
    if (before[key] === after[key] || !isSafeValue(after[key])) {
      continue;
    }
    changed = true;
    sink.capture('setting_changed', {
      key: toSnakeCase(key),
      old_value: isSafeValue(before[key]) ? before[key] : null,
      new_value: after[key],
      source_screen: currentScreen,
    });
  }
  if (changed) {
    void sink.register(settingProperties(next));
  }
}

export function resetSettingsAnalyticsForTests(): void {
  sink = null;
  currentScreen = 'unknown';
}
