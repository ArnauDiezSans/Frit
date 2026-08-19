import {
  emptyGameTypeFilters,
  matchesGameTypeFilters
} from './game-type-filter.models';

describe('game type filters', () => {
  const normal = { noLlista: false, cooperative: false, teams: false, solo: false };
  const cooperativeSolo = { noLlista: false, cooperative: true, teams: false, solo: true };

  it('shows only normal games when every filter is hidden', () => {
    const filters = emptyGameTypeFilters();

    expect(matchesGameTypeFilters(normal, filters)).toBeTrue();
    expect(matchesGameTypeFilters(cooperativeSolo, filters)).toBeFalse();
  });

  it('adds included groups to normal games', () => {
    const filters = { ...emptyGameTypeFilters(), cooperative: 'include' as const };

    expect(matchesGameTypeFilters(normal, filters)).toBeTrue();
    expect(matchesGameTypeFilters(cooperativeSolo, filters)).toBeTrue();
  });

  it('shows only the selected group in only mode, including overlaps', () => {
    const filters = { ...emptyGameTypeFilters(), cooperative: 'only' as const };

    expect(matchesGameTypeFilters(normal, filters)).toBeFalse();
    expect(matchesGameTypeFilters(cooperativeSolo, filters)).toBeTrue();
  });
});
