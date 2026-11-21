import path from 'node:path';
import { fileURLToPath } from 'node:url';

import antfu from '@antfu/eslint-config';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import i18nJsonPlugin from 'eslint-plugin-i18n-json';
import reactCompiler from 'eslint-plugin-react-compiler';
import testingLibrary from 'eslint-plugin-testing-library';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Files that still import Text from react-native. Moving them to the app's
// Text changes their default font and colour, so they move with the #262 text
// scaling work (#347), not here. Remove entries as files move; don't add any.
const legacyPlainTextFiles = [
  'src/app/\\[...messing\\].tsx',
  'src/components/posthog-error-fallback.tsx',
  'src/components/ui/animated-number.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/confirm-dialog.tsx',
  'src/components/ui/modal.tsx',
  'src/features/feedback/feedback-screen.tsx',
  'src/features/game/components/animated-path-board.tsx',
  'src/features/game/components/blunder-meter.tsx',
  'src/features/game/components/board/bear-off-area.tsx',
  'src/features/game/components/board/board-dice-overlay.tsx',
  'src/features/game/components/board/checker-token.tsx',
  'src/features/game/components/board/dice-display.tsx',
  'src/features/game/components/board/point-number-rail.tsx',
  'src/features/game/components/cube-hint-button.tsx',
  'src/features/game/components/cube-tutor-overlay.tsx',
  'src/features/game/components/doubling-cube-face.tsx',
  'src/features/game/components/game-preferences-panel.tsx',
  'src/features/game/components/guidance-modal.tsx',
  'src/features/game/components/hint-button.tsx',
  'src/features/game/components/home-game-setup.tsx',
  'src/features/game/components/home-match-options.tsx',
  'src/features/game/components/home-setup-choice.tsx',
  'src/features/game/components/match-controls.tsx',
  'src/features/game/components/match-cube.tsx',
  'src/features/game/components/move-review-bar.tsx',
  'src/features/game/components/move-review-turn-strip.tsx',
  'src/features/game/components/player-strip.tsx',
  'src/features/game/components/settings-ui/dice-style-picker.tsx',
  'src/features/game/components/settings-ui/die-face-preview.tsx',
  'src/features/game/components/settings-ui/point-numbers-icon.tsx',
  'src/features/game/components/settings-ui/setting-toggle-row.tsx',
  'src/features/game/components/strategy-chip.tsx',
  'src/features/game/components/strategy-icon.tsx',
  'src/features/game/game-screen-controls.tsx',
  'src/features/game/game-screen.tsx',
  'src/features/game/game-toolbar.tsx',
  'src/features/game/home-screen.tsx',
  'src/features/game/saved-game-recovery-banner.tsx',
  'src/features/learn/coach-caption.tsx',
  'src/features/learn/graduation-screen.tsx',
  'src/features/learn/learn-hub-screen.tsx',
  'src/features/learn/lesson-row.tsx',
  'src/features/learn/lesson-screen.tsx',
  'src/features/learn/quiz-card.tsx',
  'src/features/positions/position-board-dice.tsx',
  'src/features/positions/position-board-editor.tsx',
  'src/features/positions/position-board-picker.tsx',
  'src/features/positions/position-controls.tsx',
  'src/features/positions/position-cube.tsx',
  'src/features/positions/position-exchange.tsx',
  'src/features/positions/position-saved.tsx',
  'src/features/positions/position-scoreboard.tsx',
  'src/features/positions/position-screen.tsx',
  'src/features/positions/position-stepper.tsx',
  'src/features/positions/save-position-dialog.tsx',
  'src/features/settings/components/settings-item.tsx',
  'src/features/timer/components/timer-clock-card.tsx',
  'src/features/timer/components/timer-controls.tsx',
  'src/features/timer/timer-screen.tsx',
];

export default antfu(
  {
    // Enable React and TypeScript support
    react: true,
    typescript: true,

    // Disable JSON processing for translation files (handled by i18n-json plugin)
    jsonc: false,

    // Use ESLint Stylistic for formatting
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: true,
    },

    // Global ignores
    ignores: [
      'dist/*',
      'node_modules',
      '__tests__/',
      'coverage',
      '.expo',
      '.expo-shared',
      'android',
      'ios',
      '.vscode',
      'docs/',
      'public/bgsage/**',
      'cli/',
      '.agents/**',
      'expo-env.d.ts',
      'uniwind-env.d.ts',
      'uniwind-types.d.ts',
      '.codex/**',
      'migration/*',
    ],
  },

  // Custom rules
  {
    rules: {
      'max-params': ['error', 3],
      'max-lines-per-function': ['error', 110],
      'react/display-name': 'off',
      'react/no-inline-styles': 'off',
      'react/destructuring-assignment': 'off',
      'react/require-default-props': 'off',
      'react-refresh/only-export-components': 'warn', // Too strict for React Native
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: [
            '/android',
            '/ios',
            'README.md',
            'README-project.md',
            'ISSUE_TEMPLATE.md',
            'PULL_REQUEST_TEMPLATE.md',
          ],
        },
      ],
      'node/prefer-global/process': 'off', // process is commonly used in React Native configs
      'ts/no-require-imports': 'off', // Sometimes needed for mocks
      'ts/no-use-before-define': 'off', // Allow forward references in React components
      'no-console': 'off', // Console is useful for debugging
      'no-cond-assign': 'off', // Allow assignment in conditions when intentional
      'regexp/no-super-linear-backtracking': 'off', // Relax regex performance rules
      'regexp/no-unused-capturing-group': 'off', // Allow unused capturing groups
    },
  },

  // TypeScript-specific rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'ts/consistent-type-definitions': ['error', 'type'], // Prefer type over interface
      'react-hooks/refs': 'off', // Allow useRef without exhaustive-deps
      'ts/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
          disallowTypeAnnotations: true,
        },
      ],
    },
  },

  // Plain react-native Text skips the app's text handling (font, RTL and,
  // with #262, the font-scale caps). Use the app's Text component instead.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Text'],
              message:
                'Use Text from \'@/components/ui\' (src/components/ui/text.tsx) instead of react-native Text.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      // The app's Text wraps react-native Text.
      'src/components/ui/text.tsx',
      // Tests render plain Text as fixture children.
      'src/**/*.test.{ts,tsx}',
      ...legacyPlainTextFiles,
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // Better TailwindCSS plugin
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ...betterTailwindcss.configs.recommended,
    settings: {
      'better-tailwindcss': {
        entryPoint: path.resolve(__dirname, './src/global.css'),
      },
    },
    rules: {
      ...betterTailwindcss.configs.recommended.rules,
      'better-tailwindcss/no-unnecessary-whitespace': 'warn',
      'better-tailwindcss/no-unknown-classes': 'warn',
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off', // Can be too strict for some cases
    },
  },

  // React Compiler plugin
  {
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  },

  // i18n JSON validation
  {
    files: ['src/translations/*.json'],
    plugins: { 'i18n-json': i18nJsonPlugin },
    processor: {
      meta: { name: '.json' },
      ...i18nJsonPlugin.processors['.json'],
    },
    settings: {
      'i18n-json/ignore-keys': [],
    },
    rules: {
      ...i18nJsonPlugin.configs.recommended.rules,
      'i18n-json/valid-message-syntax': [
        2,
        {
          syntax: path.resolve(
            __dirname,
            './scripts/i18next-syntax-validation.js',
          ),
        },
      ],
      'i18n-json/valid-json': 2,
      'i18n-json/sorted-keys': [2, { order: 'asc', indentSpaces: 2 }],
      'i18n-json/identical-keys': [
        2,
        { filePath: path.resolve(__dirname, './src/translations/en.json') },
      ],
      // Disable conflicting rules for i18n JSON files
      'style/semi': 'off',
      'style/comma-dangle': 'off',
      'style/quotes': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },

  // Testing Library rules
  {
    files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
    plugins: { 'testing-library': testingLibrary },
    rules: {
      ...testingLibrary.configs.react.rules,
    },
  },
);
