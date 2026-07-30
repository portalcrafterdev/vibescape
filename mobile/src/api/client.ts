import { API_URL, REQUEST_TIMEOUT_MS } from './config';
import { clearTokens, loadTokens, saveTokens } from './tokenStore';
import type { ApiErrorBody, TokenPair } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: { field: string; reason: string }[];

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: { field: string; reason: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  /** True when the device could not reach the server at all. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/** Fired when the session is unrecoverable, so the app can return to Login. */
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  onSessionExpired = handler;
}

// Endpoints that must never trigger a refresh attempt: a 401 from them is the
// answer, not a stale-token symptom. Refreshing on /auth/refresh would recurse.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

/**
 * In-flight refresh, shared by every caller.
 *
 * Without this, N concurrent requests that all 401 would fire N refreshes. Only the
 * first would succeed — refresh tokens rotate, so the rest would present a spent
 * token, which the server treats as replay and responds to by revoking the entire
 * token family. The user would be logged out precisely because the app was busy.
 */
let refreshInFlight: Promise<TokenPair | null> | null = null;

async function refreshTokens(): Promise<TokenPair | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const stored = await loadTokens();
      if (!stored?.refreshToken) {
        return null;
      }

      const response = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: stored.refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const tokens = (await response.json()) as TokenPair;
      await saveTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      return tokens;
    } catch {
      return null;
    } finally {
      // Cleared inside the same promise so the next 401 after this settles starts a
      // fresh attempt rather than reusing a resolved one.
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let code = 'unknown_error';
  let message = 'Something went wrong. Please try again.';
  let fieldErrors: { field: string; reason: string }[] = [];

  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      fieldErrors = body.error.details ?? [];
    }
  } catch {
    // Non-JSON body (a proxy error page, for instance). Keep the generic message.
  }

  return new ApiError(response.status, code, message, fieldErrors);
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const allowRefresh = !NO_REFRESH_PATHS.some(p => path.startsWith(p));

  const send = async (accessToken: string | null): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    return fetchWithTimeout(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let response: Response;
  try {
    const stored = auth ? await loadTokens() : null;
    response = await send(stored?.accessToken ?? null);
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(
      0,
      aborted ? 'timeout' : 'network_error',
      aborted
        ? 'The request timed out. Check your connection and try again.'
        : 'Cannot reach the server. Check your connection and try again.',
    );
  }

  if (response.status === 401 && auth && allowRefresh) {
    const refreshed = await refreshTokens();

    if (!refreshed) {
      await clearTokens();
      onSessionExpired?.();
      throw new ApiError(401, 'session_expired', 'Your session has expired. Please sign in again.');
    }

    try {
      response = await send(refreshed.access_token);
    } catch {
      throw new ApiError(0, 'network_error', 'Cannot reach the server. Please try again.');
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Exposed for tests: forget any in-flight refresh between cases. */
export function __resetRefreshState(): void {
  refreshInFlight = null;
}
