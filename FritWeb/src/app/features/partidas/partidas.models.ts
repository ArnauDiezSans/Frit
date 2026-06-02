export interface Partida {
  partidaId: number;
  juegoId: number;
  fecha: string;
  duracionMinutos?: number | null;
  numeroJugadores: number;
  observaciones?: string | null;
  createdAt: string;
}