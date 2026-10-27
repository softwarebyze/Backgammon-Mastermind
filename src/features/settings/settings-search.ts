import type { TxKeyPath } from '@/lib/i18n';

import { translate } from '@/lib/i18n';

export type SettingsSearchId
  = | 'language'
    | 'showMoveHints'
    | 'showDirectionOverlay'
    | 'showPointNumbers'
    | 'tutorMode'
    | 'autoRoll'
    | 'autoMoveWhenForced'
    | 'confirmMove'
    | 'soundEnabled'
    | 'diceDisplay'
    | 'version'
    | 'openSource'
    | 'share'
    | 'rate'
    | 'support'
    | 'privacy'
    | 'terms'
    | 'github'
    | 'website'
    | 'developerOpen'
    | 'restoreDefaults';

type SettingsSearchEntry = {
  id: SettingsSearchId;
  sectionKey: TxKeyPath;
  titleKey: TxKeyPath;
  descriptionKey?: TxKeyPath;
};

export const SETTINGS_SEARCH_ENTRIES: readonly SettingsSearchEntry[] = [
  {
    id: 'language',
    sectionKey: 'settings.general',
    titleKey: 'settings.language',
  },
  {
    id: 'showMoveHints',
    sectionKey: 'settings.game',
    titleKey: 'game.preferences.move_hints',
    descriptionKey: 'game.preferences.move_hints_hint',
  },
  {
    id: 'showDirectionOverlay',
    sectionKey: 'settings.game',
    titleKey: 'game.preferences.direction_overlay',
    descriptionKey: 'game.preferences.direction_overlay_hint',
  },
  {
    id: 'showPointNumbers',
    sectionKey: 'settings.game',
    titleKey: 'game.preferences.point_numbers',
    descriptionKey: 'game.preferences.point_numbers_hint',
  },
  {
    id: 'tutorMode',
    sectionKey: 'settings.game',
    titleKey: 'game.preferences.tutor_mode',
    descriptionKey: 'game.preferences.tutor_mode_hint',
  },
  {
    id: 'autoRoll',
    sectionKey: 'settings.game',
    titleKey: 'game.preferences.auto_roll',
    descriptionKey: 'game.preferences.auto_roll_hint',
  },
  {
    id: 'autoMoveWhenForced',
    sectionKey: 'settings.game',
    titleKey: 'game.preferences.auto_move',
    descriptionKey: 'game.preferences.auto_move_hint',
  },
  {
    id: 'confirmMove',
    sectionKey: 'settings.game',
    titleKey: 'game.preferences.confirm_move',
    descriptionKey: 'game.preferences.confirm_move_hint',
  },
  {
    id: 'soundEnabled',
    sectionKey: 'settings.game',
    titleKey: 'game.preferences.sound',
    descriptionKey: 'game.preferences.sound_hint',
  },
  {
    id: 'diceDisplay',
    sectionKey: 'settings.game',
    titleKey: 'game.preferences.dice_display',
  },
  {
    id: 'version',
    sectionKey: 'settings.about',
    titleKey: 'settings.version',
  },
  {
    id: 'openSource',
    sectionKey: 'settings.about',
    titleKey: 'settings.open_source',
  },
  {
    id: 'share',
    sectionKey: 'settings.support_us',
    titleKey: 'settings.share',
  },
  {
    id: 'rate',
    sectionKey: 'settings.support_us',
    titleKey: 'settings.rate',
  },
  {
    id: 'support',
    sectionKey: 'settings.support_us',
    titleKey: 'settings.support',
  },
  {
    id: 'privacy',
    sectionKey: 'settings.links',
    titleKey: 'settings.privacy',
  },
  {
    id: 'terms',
    sectionKey: 'settings.links',
    titleKey: 'settings.terms',
  },
  {
    id: 'github',
    sectionKey: 'settings.links',
    titleKey: 'settings.github',
  },
  {
    id: 'website',
    sectionKey: 'settings.links',
    titleKey: 'settings.website',
  },
  {
    id: 'developerOpen',
    sectionKey: 'settings.developer',
    titleKey: 'settings.developer_open',
    descriptionKey: 'settings.developer_blurb',
  },
  {
    id: 'restoreDefaults',
    sectionKey: 'settings.reset',
    titleKey: 'settings.restore_defaults',
    descriptionKey: 'settings.restore_defaults_hint',
  },
];

export const GAME_SETTING_SEARCH_IDS: readonly SettingsSearchId[] = [
  'showMoveHints',
  'showDirectionOverlay',
  'showPointNumbers',
  'tutorMode',
  'autoRoll',
  'autoMoveWhenForced',
  'confirmMove',
  'soundEnabled',
  'diceDisplay',
];

const TRANSLITERATIONS: Record<string, string> = {
  æ: 'ae',
  ð: 'd',
  đ: 'd',
  ı: 'i',
  ł: 'l',
  œ: 'oe',
  ø: 'o',
  ß: 'ss',
  þ: 'th',
};

/** Case-, accent-, and punctuation-insensitive search text. */
export function normalizeSettingsSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[æðđıłœøßþ]/g, character => TRANSLITERATIONS[character] ?? character)
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

type SearchOptions = {
  /** Developer tools are hidden in production builds. */
  includeDeveloper?: boolean;
};

/**
 * Returns the settings whose localized title, description, or section contains
 * every query token. An empty query returns every available setting.
 */
export function getVisibleSettings(
  query: string,
  { includeDeveloper = false }: SearchOptions = {},
): ReadonlySet<SettingsSearchId> {
  const entries = includeDeveloper
    ? SETTINGS_SEARCH_ENTRIES
    : SETTINGS_SEARCH_ENTRIES.filter(entry => entry.id !== 'developerOpen');
  const tokens = normalizeSettingsSearchText(query).split(' ').filter(Boolean);
  const visible = new Set<SettingsSearchId>();

  if (tokens.length === 0) {
    for (const entry of entries) {
      visible.add(entry.id);
    }
    return visible;
  }

  for (const entry of entries) {
    const haystack = normalizeSettingsSearchText([
      translate(entry.titleKey),
      entry.descriptionKey ? translate(entry.descriptionKey) : '',
      translate(entry.sectionKey),
    ].join(' '));
    if (tokens.every(token => haystack.includes(token))) {
      visible.add(entry.id);
    }
  }

  return visible;
}
