import colors from '@/components/ui/colors';

export const GAME_PALETTE = {
  // App background behind the board + headers
  bg: '#1E0C02',

  // Sheet / card surfaces used by the game UI
  surface: '#2A1408',
  surfaceBorder: 'rgba(255, 196, 153, 0.18)',

  // Text
  text: colors.neutral[100],
  textMuted: colors.neutral[400],

  // Accents used for header icons, links, etc.
  accent: colors.primary[400],
  accentDim: colors.primary[200],

  // Primary action controls (roll dice, confirm move)
  control: '#8B1A1A',
  controlBorder: '#6B2820',
} as const;
