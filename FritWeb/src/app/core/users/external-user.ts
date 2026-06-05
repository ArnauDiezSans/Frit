export const EXTERNAL_USER_ID = 16;
export const EXTERNAL_USER_NAME = 'Extern';

export interface UsuarioIdentity {
  usuarioId: number;
  nombre: string;
}

export function isExternalUser(usuario: UsuarioIdentity): boolean {
  return usuario.usuarioId === EXTERNAL_USER_ID ||
    usuario.nombre.trim().toLowerCase() === EXTERNAL_USER_NAME.toLowerCase();
}

export function excludeExternalUsers<T extends UsuarioIdentity>(usuarios: T[]): T[] {
  return usuarios.filter(usuario => !isExternalUser(usuario));
}
