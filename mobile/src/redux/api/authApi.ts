import { apiSlice } from "./apiSlice";

interface LoginRequest {
  identifier: string;
  password: string;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface AuthUser {
  id: string;
  username: string;
  email: string;
  created_at: string;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  gender?: string | null;
}

interface SignUpRequest {
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  user: AuthUser;
  tokens: TokenPair;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<
      AuthResponse,
      LoginRequest
    >({
      query: (body) => ({
        url: "auth/login",
        method: "POST",
        body,
      }),
    }),
    signUp: builder.mutation<
      AuthResponse,
      SignUpRequest
    >({
      query: (body) => ({
        url: "auth/register",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useSignUpMutation
} = authApi;