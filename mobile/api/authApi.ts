import api from "./axios";
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthUser {
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

export interface AuthResponse {
  user: AuthUser;
  tokens: TokenPair;
}

export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
}

export interface forgotrequest{
  email : string;
}

export const loginUser = async (
  data: LoginRequest
): Promise<AuthResponse> => {

  const response = await api.post(
    "/auth/login",
    data
  );

  if (response.status === 204 || !response.data) {
    throw new Error("The server returned an empty response.");
  }

  return response.data;
};


export const registerUser = async (
  data: SignUpRequest
) => {
  const response = await api.post(
    "/auth/register",
    data
  );

  if (response.status === 204 || !response.data) {
    throw new Error("The server returned an empty response.");
  }

  return response.data;
};

export const forgotpassword = async(
   data: forgotrequest
)=>{
  const response = await api.post("/auth/forgot-password", data);

  if(response.status === 204 || !response.data){
    throw new Error("The server returned an empty response");
  }

  return response.data;
};