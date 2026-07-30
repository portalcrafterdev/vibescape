import { request } from './client';
import type { AuthResponse, MessageResponse, User } from './types';

export function register(input: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

export function login(input: { identifier: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

export function logout(refreshToken: string | null): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/logout', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
}

export function forgotPassword(email: string): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: { token: input.token, new_password: input.newPassword },
    auth: false,
  });
}

export function me(): Promise<User> {
  return request<User>('/auth/me');
}
