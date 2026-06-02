export interface Juego {
  juegoId: number;
  nombre: string;
  bggId?: number | null;
  dificultadBgg?: number | null;
  numeroJugadoresMin: number;
  numeroJugadoresMax: number;
  pvp?: number | null;
  propietarioId: number;
  fechaAdquisicion?: string | null;
  tipo: string;
  juegoBaseId?: number | null;
}

export interface CrearJuegoRequest {
  juegoId: number;
  nombre: string;
  bggId?: number | null;
  dificultadBgg?: number | null;
  numeroJugadoresMin: number;
  numeroJugadoresMax: number;
  pvp?: number | null;
  propietarioId: number;
  fechaAdquisicion?: string | null;
  tipo: string;
  juegoBaseId?: number | null;
}

export interface UsuarioOption {
  usuarioId: number;
  nombre: string;
  grupo?: string | null;
  observaciones?: string | null;
  createdAt: string;
}