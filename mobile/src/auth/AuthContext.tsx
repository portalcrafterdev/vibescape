import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as authApi from '../api/auth';
import { ApiError, setSessionExpiredHandler } from '../api/client';
import { clearTokens, loadTokens, saveTokens } from '../api/tokenStore';
import type { User } from '../api/types';

type AuthState = {
  /** True until the stored session has been checked. Gate navigation on this. */
  isHydrating: boolean;
  user: User | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: { username: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrating, setIsHydrating] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const signOut = useCallback(async () => {
    const stored = await loadTokens();

    try {
      await authApi.logout(stored?.refreshToken ?? null);
    } catch {
      // A failed call must not strand the user in a signed-in state. Clearing the
      // Keychain below is what actually ends the session on this device.
    }

    await clearTokens();
    setUser(null);
  }, []);

  // Restore the session on launch. Stored tokens alone are not proof of a valid
  // session — they may be revoked or expired — so verify with the server. The
  // client refreshes automatically on a 401, so a merely-stale access token
  // recovers here rather than logging the user out.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await loadTokens();
        if (!stored) {
          return;
        }

        const profile = await authApi.me();
        if (!cancelled) {
          setUser(profile);
        }
      } catch (error) {
        // Only a rejected session should clear tokens. A network failure at launch
        // (airplane mode, dead wifi) must not sign the user out.
        if (error instanceof ApiError && !error.isNetworkError) {
          await clearTokens();
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Lets the API client drop the user back to Login when a refresh fails mid-session.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const result = await authApi.login({ identifier, password });
    await saveTokens({
      accessToken: result.tokens.access_token,
      refreshToken: result.tokens.refresh_token,
    });
    setUser(result.user);
  }, []);

  const signUp = useCallback(
    async (input: { username: string; email: string; password: string }) => {
      const result = await authApi.register(input);
      await saveTokens({
        accessToken: result.tokens.access_token,
        refreshToken: result.tokens.refresh_token,
      });
      setUser(result.user);
    },
    [],
  );

  const value = useMemo(
    () => ({ isHydrating, user, signIn, signUp, signOut }),
    [isHydrating, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
