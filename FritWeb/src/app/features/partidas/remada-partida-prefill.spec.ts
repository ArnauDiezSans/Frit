import { Remada } from '../a-que-juguem/a-que-juguem.service';
import { buildRemadaPartidaPrefill } from './remada-partida-prefill';

describe('buildRemadaPartidaPrefill', () => {
  it('preserves participants and orders candidate games by rowing position', () => {
    const createdAt = new Date(2026, 7, 20, 12).toISOString();
    const remada: Remada = {
      remadaId: 7,
      createdAt,
      tempsDisponibleMinuts: 120,
      tempsMinimMinuts: 30,
      nombreJocs: 5,
      puntsPerJugador: 2,
      jugadors: [
        { usuarioId: 4, nombre: 'Anna', punts: 2 },
        { usuarioId: 9, nombre: 'Biel', punts: 2 }
      ],
      jocs: [
        { juegoId: 20, nombre: 'Segon', posicion: 2 },
        { juegoId: 10, nombre: 'Primer', posicion: 1 }
      ]
    };

    expect(buildRemadaPartidaPrefill(remada)).toEqual({
      fecha: '2026-08-20',
      jugadores: [
        { usuarioId: 4, nombre: 'Anna' },
        { usuarioId: 9, nombre: 'Biel' }
      ],
      juegoIds: [10, 20]
    });
  });
});
