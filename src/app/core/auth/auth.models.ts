export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
}

export function normalizeLoginCredentials(credentials: LoginRequest): LoginRequest {
  return {
    username: credentials.username.trim().toUpperCase(),
    password: credentials.password.trim(),
  };
}
