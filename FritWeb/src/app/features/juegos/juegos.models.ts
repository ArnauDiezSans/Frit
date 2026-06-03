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

export interface BggJuegoLookup {
  bggId: number;
  nombre: string;
  dificultadBgg?: number | null;
  numeroJugadoresMin: number;
  numeroJugadoresMax: number;
  tipo: string;
  yearPublished?: number | null;
  playingTime?: number | null;
}

export interface UsuarioOption {
  usuarioId: number;
  nombre: string;
}