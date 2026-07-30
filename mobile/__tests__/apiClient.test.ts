/**
 * @format
 */

import { ApiError, __resetRefreshState, request, setSessionExpiredHandler } from '../src/api/client';
import * as tokenStore from '../src/api/tokenStore';

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly' },
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

const json = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

describe('api client', () => {
  beforeEach(async () => {
    __resetRefreshState();
    await tokenStore.clearTokens();
    setSessionExpiredHandler(null);
    jest.restoreAllMocks();
  });

  it('attaches the access token to authenticated requests', async () => {
    await tokenStore.saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });

    const fetchMock = jest.fn(() => json(200, { ok: true }));
    globalThis.fetch = fetchMock as any;

    await request('/anything');

    const [, init] = fetchMock.mock.calls[0] as any;
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('refreshes once on 401 and retries the original request', async () => {
    await tokenStore.saveTokens({ accessToken: 'stale', refreshToken: 'refresh-1' });

    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => json(401, { error: { code: 'not_authenticated' } }))
      .mockImplementationOnce(() =>
        json(200, {
          access_token: 'fresh',
          refresh_token: 'refresh-2',
          token_type: 'bearer',
          expires_in: 900,
        }),
      )
      .mockImplementationOnce(() => json(200, { ok: true }));
    globalThis.fetch = fetchMock as any;

    const result = await request<{ ok: boolean }>('/protected');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // The retry must carry the new token, not the stale one.
    const [, retryInit] = fetchMock.mock.calls[2] as any;
    expect(retryInit.headers.Authorization).toBe('Bearer fresh');
  });

  it('rotates the stored refresh token after a refresh', async () => {
    await tokenStore.saveTokens({ accessToken: 'stale', refreshToken: 'refresh-1' });

    globalThis.fetch = jest
      .fn()
      .mockImplementationOnce(() => json(401, {}))
      .mockImplementationOnce(() =>
        json(200, {
          access_token: 'fresh',
          refresh_token: 'refresh-2',
          token_type: 'bearer',
          expires_in: 900,
        }),
      )
      .mockImplementationOnce(() => json(200, {})) as any;

    await request('/protected');

    expect(tokenStore.peekTokens()).toEqual({
      accessToken: 'fresh',
      refreshToken: 'refresh-2',
    });
  });

  it('fires only ONE refresh for concurrent 401s', async () => {
    // The server rotates refresh tokens and treats a replayed one as theft by
    // revoking the whole family. Three parallel refreshes would send the same token
    // three times and log the user out for being busy.
    await tokenStore.saveTokens({ accessToken: 'stale', refreshToken: 'refresh-1' });

    let refreshCalls = 0;
    globalThis.fetch = jest.fn((url: string) => {
      if (String(url).includes('/auth/refresh')) {
        refreshCalls += 1;
        return json(200, {
          access_token: 'fresh',
          refresh_token: 'refresh-2',
          token_type: 'bearer',
          expires_in: 900,
        });
      }
      // Every protected call 401s until a fresh token exists.
      const stored = tokenStore.peekTokens();
      return stored?.accessToken === 'fresh' ? json(200, { ok: true }) : json(401, {});
    }) as any;

    await Promise.all([request('/a'), request('/b'), request('/c')]);

    expect(refreshCalls).toBe(1);
  });

  it('clears tokens and signals expiry when refresh fails', async () => {
    await tokenStore.saveTokens({ accessToken: 'stale', refreshToken: 'dead' });

    const onExpired = jest.fn();
    setSessionExpiredHandler(onExpired);

    globalThis.fetch = jest
      .fn()
      .mockImplementationOnce(() => json(401, {}))
      .mockImplementationOnce(() => json(401, {})) as any;

    await expect(request('/protected')).rejects.toThrow(ApiError);

    expect(tokenStore.peekTokens()).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a refresh when login itself returns 401', async () => {
    const fetchMock = jest.fn(() =>
      json(401, { error: { code: 'invalid_credentials', message: 'Incorrect username or password' } }),
    );
    globalThis.fetch = fetchMock as any;

    await expect(
      request('/auth/login', { method: 'POST', body: {}, auth: false }),
    ).rejects.toMatchObject({ code: 'invalid_credentials' });

    // One call only — a bad password is the answer, not a stale-token symptom.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces the server error envelope', async () => {
    globalThis.fetch = jest.fn(() =>
      json(409, { error: { code: 'username_taken', message: 'That username is already taken' } }),
    ) as any;

    await expect(request('/auth/register', { method: 'POST', auth: false })).rejects.toMatchObject({
      status: 409,
      code: 'username_taken',
      message: 'That username is already taken',
    });
  });

  it('reports an unreachable server as a network error', async () => {
    globalThis.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as any;

    await expect(request('/anything', { auth: false })).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
    });
  });
});
