export interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (ms)
  user?: {
    id: string;
    handle: string;
    email: string;
    img_url: string;
  };
  // PKCE temporary storage
  state?: string;
  codeVerifier?: string;
}

export interface FigmaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  user_id?: string;
}

export interface FigmaUserResponse {
  id: string;
  handle: string;
  email: string;
  img_url: string;
}
