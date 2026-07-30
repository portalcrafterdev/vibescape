import { Platform } from 'react-native';

/**
 * Base URL for the API.
 *
 * The host differs per target and getting it wrong looks like the server is down:
 * - iOS simulator shares the Mac's loopback, so 127.0.0.1 works.
 * - The Android emulator runs in a VM where 127.0.0.1 is the emulator itself.
 *   10.0.2.2 is the alias for the host machine.
 * - A physical device needs the Mac's LAN address; loopback is meaningless there.
 *
 * Override with DEV_API_HOST when testing on hardware.
 */
const DEV_API_HOST: string | null = null; // e.g. '192.168.1.24'

const DEV_PORT = 8000;

function devBaseUrl(): string {
  if (DEV_API_HOST) {
    return `http://${DEV_API_HOST}:${DEV_PORT}`;
  }
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${DEV_PORT}`
    : `http://127.0.0.1:${DEV_PORT}`;
}

// Production must be HTTPS — the cleartext exemptions in the native network configs
// are scoped to development hosts only.
const PROD_BASE_URL = 'https://api.vibescape.app';

export const API_BASE_URL = __DEV__ ? devBaseUrl() : PROD_BASE_URL;

export const API_PREFIX = '/api/v1';

export const API_URL = `${API_BASE_URL}${API_PREFIX}`;

/** Requests that hang forever are indistinguishable from a frozen app. */
export const REQUEST_TIMEOUT_MS = 15000;
