const transformIgnorePatterns = [
  `node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|standard-navigation|@react-navigation/.*|@unimodules/.*|unimodules|@sentry/.*|native-base|react-native-svg|@gorhom/.*|@shopify/.*|@tanstack/.*|react-native-reanimated|react-native-mmkv|react-native-nitro-modules|react-native-worklets|moti|zustand|tailwind-merge|tailwind-variants|uniwind))`,
];
const moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^tsx/cjs$': '<rootDir>/__mocks__/tsx-cjs.js',
};

module.exports = {
  projects: [
    {
      displayName: 'native',
      preset: 'jest-expo',
      setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
      testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
      testPathIgnorePatterns: ['/node_modules/', '\\.dom\\.test\\.tsx?$'],
      moduleFileExtensions: ['js', 'ts', 'tsx'],
      transformIgnorePatterns,
      moduleNameMapper,
    },
    {
      // Real react-dom + RN-web under jsdom. The native preset's RN setup
      // redefines `window`, which jsdom (Jest 30) does not allow.
      displayName: 'dom',
      preset: 'jest-expo/web',
      testMatch: ['**/*.dom.test.ts?(x)'],
      globals: { IS_REACT_ACT_ENVIRONMENT: true },
      moduleFileExtensions: ['js', 'ts', 'tsx'],
      transformIgnorePatterns,
      moduleNameMapper,
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest-setup.ts',
    '!**/docs/**',
    '!**/cli/**',
  ],
  coverageReporters: ['json-summary', ['text', { file: 'coverage.txt' }]],
  reporters: [
    'default',
    ['github-actions', { silent: false }],
    'summary',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'jest-junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],
  coverageDirectory: '<rootDir>/coverage/',
};
