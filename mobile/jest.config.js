module.exports = {
  preset: '@react-native/jest-preset',
  // The RN preset only whitelists react-native itself. Navigation, gesture-handler,
  // reanimated and friends ship untranspiled ESM, so they need transforming too.
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?(' +
      '(jest-)?react-native|@react-native(-community)?|@react-navigation|' +
      'react-native-.*|react-freeze|nanoid|use-latest-callback' +
      ')/)',
  ],
  // lucide ships .mjs, which the preset's transform doesn't match. It publishes a CJS
  // build, so point jest at that instead of widening the transform to .mjs.
  moduleNameMapper: {
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
    '^lucide-react-native/icons/(.*)$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
