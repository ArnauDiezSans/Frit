export interface PartidaJugadorValidationInput {
  usuarioId?: number | null;
  usuarioSearch?: string | null;
  nombreMostrado?: string | null;
  posicion?: number | null;
}

export interface PartidaEquipoValidationInput {
  numeroJugadores?: number | null;
  posicion?: number | null;
  jugadores?: PartidaJugadorValidationInput[];
}

export interface PartidaValidationInput {
  juegoId: number | null;
  fecha: string | null;
  numeroJugadores: number | null;
  perEquips: boolean | null;
  jugadores: PartidaJugadorValidationInput[];
  equipos: PartidaEquipoValidationInput[];
}

export function getPartidaPlayerDisplayName(jugador: PartidaJugadorValidationInput): string {
  const nombreMostrado = jugador.nombreMostrado?.trim();
  return nombreMostrado || jugador.usuarioSearch?.trim() || '';
}

function hasSelectedPlayer(jugador: PartidaJugadorValidationInput): boolean {
  return !!(jugador.usuarioId && Number.isFinite(jugador.usuarioId) && jugador.usuarioId > 0)
    || !!getPartidaPlayerDisplayName(jugador);
}

export function getPartidaValidationErrors(input: PartidaValidationInput): string[] {
  const errors: string[] = [];

  if (!input.juegoId) {
    errors.push('Has de seleccionar un joc.');
  }

  if (!input.fecha?.trim()) {
    errors.push("Has d'indicar una data.");
  }

  const numeroJugadores = Number(input.numeroJugadores);
  if (!Number.isFinite(numeroJugadores) || numeroJugadores < 1) {
    errors.push('Has d’indicar un nombre de jugadors vàlid.');
  }

  if (input.perEquips) {
    const equipos = input.equipos ?? [];

    if (equipos.length === 0) {
      errors.push("Has d'afegir almenys un equip.");
      return errors;
    }

    equipos.forEach((equipo, equipoIndex) => {
      const equipoLabel = `l'equip ${equipoIndex + 1}`;
      const teamPlayers = equipo.jugadores ?? [];

      const teamSize = Number(equipo.numeroJugadores);
      if (!Number.isFinite(teamSize) || teamSize < 1) {
        errors.push(`Falta el nombre de jugadors de ${equipoLabel}.`);
      }

      const teamPosition = Number(equipo.posicion);
      if (!Number.isFinite(teamPosition) || teamPosition < 1) {
        errors.push(`Falta la posició de ${equipoLabel}.`);
      }

      if (teamPlayers.length === 0) {
        errors.push(`L'equip ${equipoIndex + 1} ha de tenir almenys un jugador.`);
        return;
      }

      teamPlayers.forEach((jugador, jugadorIndex) => {
        const playerLabel = `el jugador ${jugadorIndex + 1} de ${equipoLabel}`;

        if (!hasSelectedPlayer(jugador)) {
          errors.push(`Falta l'usuari de ${playerLabel}.`);
        }

        const playerPosition = Number(jugador.posicion);
        if (!Number.isFinite(playerPosition) || playerPosition < 1) {
          errors.push(`Falta la posició de ${playerLabel}.`);
        }
      });
    });
  } else {
    const jugadores = input.jugadores ?? [];

    if (jugadores.length === 0) {
      errors.push("Has d'afegir almenys un jugador.");
      return errors;
    }

    jugadores.forEach((jugador, jugadorIndex) => {
      const playerLabel = `el jugador ${jugadorIndex + 1}`;

      if (!hasSelectedPlayer(jugador)) {
        errors.push(`Falta l'usuari de ${playerLabel}.`);
      }

      const playerPosition = Number(jugador.posicion);
      if (!Number.isFinite(playerPosition) || playerPosition < 1) {
        errors.push(`Falta la posició de ${playerLabel}.`);
      }
    });
  }

  return errors;
}
