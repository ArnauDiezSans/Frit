import {
  getPartidaPlayerDisplayName,
  getPartidaValidationErrors,
  PartidaValidationInput
} from './partida-validation';

describe('partida validation', () => {
  it('uses the free-text name when the player is not a registered user', () => {
    expect(getPartidaPlayerDisplayName({
      usuarioId: null,
      usuarioSearch: '  Jugador convidat  ',
      nombreMostrado: ''
    })).toBe('Jugador convidat');
  });

  it('allows a free-text player in an individual game', () => {
    const input: PartidaValidationInput = {
      juegoId: 1,
      fecha: '2026-08-08',
      numeroJugadores: 1,
      perEquips: false,
      jugadores: [{
        usuarioId: null,
        usuarioSearch: 'Jugador convidat',
        nombreMostrado: '',
        posicion: 1
      }],
      equipos: []
    };

    expect(getPartidaValidationErrors(input)).toEqual([]);
  });

  it('allows a free-text player in a team game', () => {
    const input: PartidaValidationInput = {
      juegoId: 1,
      fecha: '2026-08-08',
      numeroJugadores: 1,
      perEquips: true,
      jugadores: [],
      equipos: [{
        numeroJugadores: 1,
        posicion: 1,
        jugadores: [{
          usuarioId: null,
          usuarioSearch: 'Jugador convidat',
          nombreMostrado: '',
          posicion: 1
        }]
      }]
    };

    expect(getPartidaValidationErrors(input)).toEqual([]);
  });
});
