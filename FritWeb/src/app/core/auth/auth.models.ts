export interface LoginRequest {
  nombre: string;
  password: string;
}

export interface RegisterRequest {
  tenantCodi: string;
  nombre: string;
  password: string;
}

export interface AuthUser {
  usuarioId: number;
  nombre: string;
  esAdmin: boolean;
  potVeureAuditoria: boolean;
  tenantId: number;
  tenantCodi: string;
  tenantNom: string;
}
