import { Remada } from '../a-que-juguem/a-que-juguem.service';

export interface RemadaPartidaPrefill {
  fecha: string;
  jugadores: { usuarioId: number; nombre: string }[];
  juegoIds: number[];
}

export function buildRemadaPartidaPrefill(remada: Remada): RemadaPartidaPrefill {
  const date = new Date(remada.createdAt);
  const fecha = Number.isNaN(date.getTime())
    ? ''
    : [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      ].join('-');

  return {
    fecha,
    jugadores: remada.jugadors.map(jugador => ({
      usuarioId: jugador.usuarioId,
      nombre: jugador.nombre
    })),
    juegoIds: remada.jocs
      .slice()
      .sort((a, b) => a.posicion - b.posicion)
      .map(juego => juego.juegoId)
  };
}
