export type GameTypeFilterKey = 'noLlista' | 'cooperative' | 'teams' | 'solo';
export type GameTypeFilterState = 'hidden' | 'include' | 'only';

export type GameTypeFilterStates = Record<GameTypeFilterKey, GameTypeFilterState>;

export interface GameTypeClassification {
  noLlista: boolean;
  cooperative: boolean;
  teams: boolean;
  solo: boolean;
}

export function emptyGameTypeFilters(): GameTypeFilterStates {
  return {
    noLlista: 'hidden',
    cooperative: 'hidden',
    teams: 'hidden',
    solo: 'hidden'
  };
}

export function matchesGameTypeFilters(
  classification: GameTypeClassification,
  filters: GameTypeFilterStates
): boolean {
  const keys = Object.keys(filters) as GameTypeFilterKey[];
  const only = keys.find(key => filters[key] === 'only');

  if (only) {
    return classification[only];
  }

  const isNormal = keys.every(key => !classification[key]);
  return isNormal || keys.some(key => classification[key] && filters[key] === 'include');
}
