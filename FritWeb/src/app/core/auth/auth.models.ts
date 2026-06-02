export interface LoginRequest {
  nombre: string;
  password: string;
}

export interface AuthUser {
  usuarioId: number;
  nombre: string;
}