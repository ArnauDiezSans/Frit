export interface Partida {
  partidaId: number;
  juegoId: number;
  fecha: string;
  duracionMinutos?: number | null;
  numeroJugadores: number;
  observaciones?: string | null;
  createdAt: string;
}

export interface PartidaJugador {
  partidaJugadorId: number;
  partidaId: number;
  usuarioId?: number | null;
  nombreMostrado: string;
  posicion: number;
  puntos?: number | null;
}

export interface PartidaGridRow {
  partidaId: number;
  juegoId: number;
  juegoNombre: string;
  fecha: string;
  duracionMinutos: number | null;
  numeroJugadores: number;
  resultadoJugadores: string;
  observaciones: string;
}