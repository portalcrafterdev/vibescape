/**
 * Jest setup for native modules that have no JS implementation under test.
 */

// react-native-gesture-handler ships its own jest setup.
require('react-native-gesture-handler/jestSetup');

// Reanimated's mock must be installed before any module that imports it.
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

// react-native-screens calls into native code on mount; disable it for tests.
jest.mock('react-native-screens', () => {
  const actual = jest.requireActual('react-native-screens');
  return { ...actual, enableScreens: jest.fn() };
});
