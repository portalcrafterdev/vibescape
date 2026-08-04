/**
 * Jest setup for native modules that have no JS implementation under test.
 */

// react-native-gesture-handler ships its own jest setup.
require('react-native-gesture-handler/jestSetup');

// Reanimated's mock must be installed before any module that imports it.
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

// AsyncStorage is a native module with no JS fallback. This build of the package
// no longer ships its own jest mock, so back it with an in-memory map.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn(key =>
        Promise.resolve(store.has(key) ? store.get(key) : null),
      ),
      setItem: jest.fn((key, value) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn(key => {
        store.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
      multiGet: jest.fn(keys =>
        Promise.resolve(keys.map(key => [key, store.get(key) ?? null])),
      ),
      multiSet: jest.fn(() => Promise.resolve()),
      multiRemove: jest.fn(() => Promise.resolve()),
      mergeItem: jest.fn(() => Promise.resolve()),
    },
  };
});

// camera-roll resolves its TurboModule at import time, which throws outside a
// native binary. The shipped __mocks__ only covers the internal interface.
jest.mock('@react-native-camera-roll/camera-roll', () => ({
  __esModule: true,
  CameraRoll: {
    getPhotos: jest.fn(() =>
      Promise.resolve({ edges: [], page_info: { has_next_page: false } }),
    ),
    iosGetImageDataById: jest.fn(() =>
      Promise.resolve({ node: { image: { filepath: '/tmp/photo.jpg' } } }),
    ),
  },
  iosReadGalleryPermission: jest.fn(() => Promise.resolve('granted')),
  iosRequestReadWriteGalleryPermission: jest.fn(() =>
    Promise.resolve('granted'),
  ),
  cameraRollEventEmitter: {
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

// VisionCamera builds its native session at import time, which is not there
// under test. The screens that use it are never rendered by the smoke test.
jest.mock('react-native-vision-camera', () => ({
  __esModule: true,
  Camera: () => null,
  useCameraDevice: () => ({ id: 'test-camera' }),
  useCameraPermission: () => ({
    hasPermission: true,
    requestPermission: jest.fn(() => Promise.resolve(true)),
  }),
  useMicrophonePermission: () => ({
    hasPermission: true,
    requestPermission: jest.fn(() => Promise.resolve(true)),
  }),
  usePhotoOutput: () => ({
    capturePhotoToFile: jest.fn(() =>
      Promise.resolve({ filePath: '/tmp/photo.jpg' }),
    ),
  }),
  useVideoOutput: () => ({
    createRecorder: jest.fn(() =>
      Promise.resolve({
        startRecording: jest.fn(() => Promise.resolve()),
        stopRecording: jest.fn(() => Promise.resolve()),
      }),
    ),
  }),
}));

// react-native-screens calls into native code on mount; disable it for tests.
jest.mock('react-native-screens', () => {
  const actual = jest.requireActual('react-native-screens');
  return { ...actual, enableScreens: jest.fn() };
});
