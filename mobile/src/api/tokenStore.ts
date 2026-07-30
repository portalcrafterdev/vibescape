import * as Keychain from 'react-native-keychain';

/**
 * Token storage backed by the iOS Keychain / Android Keystore.
 *
 * Deliberately NOT AsyncStorage: that is an unencrypted file, readable by anything
 * with filesystem access on a rooted or jailbroken device, and included in some
 * backups. Tokens are credentials and belong in the platform credential store.
 */

const SERVICE = 'app.vibescape.auth';

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

// Cached in memory so the hot path (attaching a header to every request) does not
// hit the Keychain each time. Keychain remains the source of truth across launches.
let cache: StoredTokens | null = null;

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  cache = tokens;
  await Keychain.setGenericPassword(
    'vibescape',
    JSON.stringify(tokens),
    {
      service: SERVICE,
      // Not synced to iCloud and unavailable until the device has been unlocked once
      // after boot, so a stolen locked device does not surrender the tokens.
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    },
  );
}

export async function loadTokens(): Promise<StoredTokens | null> {
  if (cache) {
    return cache;
  }

  try {
    const stored = await Keychain.getGenericPassword({ service: SERVICE });
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored.password) as StoredTokens;
    if (!parsed?.accessToken || !parsed?.refreshToken) {
      // Partial or corrupt entry is worse than none — clear it rather than looping
      // on a token that can never work.
      await clearTokens();
      return null;
    }

    cache = parsed;
    return parsed;
  } catch {
    await clearTokens();
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  cache = null;
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // Nothing stored, or the store is unavailable. The in-memory cache is cleared
    // either way, which is what governs the current session.
  }
}

/** Synchronous read of the cached pair. Null before hydration completes. */
export function peekTokens(): StoredTokens | null {
  return cache;
}
