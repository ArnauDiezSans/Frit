export interface LoginRequest {
  tenantCodi: string;
  nombre: string;
  password: string;
}

export interface RegisterRequest {
  tenantCodi: string;
  codiRegistre: string;
  nombre: string;
  observaciones?: string | null;
  password: string;
}

export interface AuthUser {
  usuarioId: number;
  nombre: string;
  esAdmin: boolean;
  tenantId: number;
  tenantCodi: string;
  tenantNom: string;
}
