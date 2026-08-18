export interface Juego {
  juegoId: number;
  nombre: string;
  bggId?: number | null;
  dificultadBgg?: number | null;
  numeroJugadoresMin: number;
  numeroJugadoresMax: number;
  pvp?: number | null;
  propietarioId: number;
  esPropiedadTenant?: boolean;
  fechaAdquisicion?: string | null;
  tipo: string;
  esCooperativo: boolean;
  esPorEquipos: boolean;
  esNoLista: boolean;
  juegoBaseId?: number | null;
  tieneProgresoNiveles: boolean;
}

export interface JuegoProgresoJugador { juegoProgresoJugadorId: number; usuarioId?: number | null; nombre: string; esVisita: boolean; orden: number; }
export interface JuegoProgresoNivel { juegoProgresoNivelId: number; nombre: string; orden: number; }
export interface JuegoProgresoMarca { juegoProgresoJugadorId: number; juegoProgresoNivelId: number; }
export interface JuegoProgreso { juegoId: number; juegoNombre: string; jugadores: JuegoProgresoJugador[]; niveles: JuegoProgresoNivel[]; marcas: JuegoProgresoMarca[]; }

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
  color?: string | null;
}
