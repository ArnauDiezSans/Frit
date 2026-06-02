export interface LoginRequest {
  nombre: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  grupo?: string | null;
  observaciones?: string | null;
  password: string;
}

export interface AuthUser {
  usuarioId: number;
  nombre: string;
}