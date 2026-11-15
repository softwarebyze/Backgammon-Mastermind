/**
 * Web traffic attribution for the React Native PostHog SDK.
 *
 * posthog-react-native sends `$screen` events and never reads the browser's
 * referrer or UTM params, so PostHog's "Top referrers" / Web Analytics stay
 * empty for the web build. This module fills the gap the way posthog-js does:
 *
 * - The landing page's referrer and UTM params become super properties, so
 *   every event this page load sends can be broken down by traffic source.
 * - The same values go into `$set_once` as `$initial_*` person properties, so
 *   first-touch attribution survives later visits.
 * - Each web route change also sends a `$pageview` with `$current_url` /
 *   `$pathname`, which is what the built-in web insights filter on.
 */
type AttributionValue = string;

type PageviewProperties = Record<string, string | Record<string, AttributionValue>>;

type WebAttributionSink = {
  capture: (event: string, properties?: PageviewProperties) => void;
  register: (properties: Record<string, AttributionValue>) => void | Promise<void>;
};

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

/** posthog-js reports a missing referrer as `$direct`; match it. */
export const DIRECT = '$direct';

const MAX_VALUE_LENGTH = 200;

function referringDomain(referrer: string): string {
  if (!referrer) {
    return DIRECT;
  }
  try {
    return new URL(referrer).hostname || DIRECT;
  }
  catch {
    return DIRECT;
  }
}

/** Landing-page attribution: super properties plus their first-touch copies. */
export function getWebAttribution(input: { href: string; referrer: string }): {
  properties: Record<string, AttributionValue>;
  setOnce: Record<string, AttributionValue>;
} {
  const referrer = input.referrer ? input.referrer.slice(0, MAX_VALUE_LENGTH) : DIRECT;
  const properties: Record<string, AttributionValue> = {
    $referrer: referrer,
    $referring_domain: referringDomain(input.referrer),
  };

  let params: URLSearchParams | null = null;
  try {
    params = new URL(input.href).searchParams;
  }
  catch {
    params = null;
  }
  for (const key of UTM_KEYS) {
    const value = params?.get(key)?.trim();
    if (value) {
      properties[key] = value.slice(0, MAX_VALUE_LENGTH);
    }
  }

  const setOnce: Record<string, AttributionValue> = {};
  for (const [key, value] of Object.entries(properties)) {
    setOnce[key.startsWith('$') ? `$initial_${key.slice(1)}` : `$initial_${key}`] = value;
  }
  return { properties, setOnce };
}

type BrowserLocation = { href: string; origin: string; pathname: string };

let sink: WebAttributionSink | null = null;
let pendingSetOnce: Record<string, AttributionValue> | null = null;

/** Call once at startup on web, before the first route renders. */
export function bindWebAttribution(
  next: WebAttributionSink,
  page: { href: string; referrer: string },
): void {
  sink = next;
  const { properties, setOnce } = getWebAttribution(page);
  void sink.register(properties);
  pendingSetOnce = setOnce;
}

/**
 * Sends a `$pageview` for the router's pathname. The first one carries `$set_once`.
 *
 * The root layout's effect can run before expo-router pushes the new URL into
 * the browser history, so `location` may still describe the previous page.
 * Keep its query string (UTM params on the landing page) only when it matches.
 */
export function trackWebPageview(pathname: string, location: BrowserLocation): void {
  if (!sink) {
    return;
  }
  const properties: PageviewProperties = {
    $current_url: location.pathname === pathname ? location.href : `${location.origin}${pathname}`,
    $pathname: pathname,
  };
  if (pendingSetOnce) {
    properties.$set_once = pendingSetOnce;
    pendingSetOnce = null;
  }
  sink.capture('$pageview', properties);
}

export function resetWebAttributionForTests(): void {
  sink = null;
  pendingSetOnce = null;
}
