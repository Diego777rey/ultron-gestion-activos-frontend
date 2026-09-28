export interface LoginRequest {
  username: string;
  password: string;
}

export interface Permiso {
  id: number;
  modulo: string;
  accion: string;
  descripcion: string;
}

export interface Role {
  id: number;
  descripcion: string;
  permisos: Permiso[];
}

export interface LoginResponse {
  token: string;
  username: string;
  roles: Role[];
}

export function normalizeLoginCredentials(credentials: LoginRequest): LoginRequest {
  return {
    username: credentials.username.trim().toUpperCase(),
    password: credentials.password.trim(),
  };
}
