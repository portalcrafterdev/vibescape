export type User = {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  gender: string | null;
  created_at: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type AuthResponse = {
  user: User;
  tokens: TokenPair;
};

export type MessageResponse = {
  message: string;
};

/** Matches the server's error envelope. */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: { field: string; reason: string }[];
  };
};
