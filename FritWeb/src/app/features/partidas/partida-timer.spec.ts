import { elapsedMinutes, elapsedSince, formatPartidaTimer } from './partida-timer';

describe('partida timer', () => {
  it('shows minutes and seconds before the first hour', () => {
    expect(formatPartidaTimer(5 * 60_000 + 7_000)).toBe('05:07');
  });

  it('adds hours only when needed', () => {
    expect(formatPartidaTimer(3_661_000)).toBe('01:01:01');
  });

  it('rounds the elapsed duration to the nearest minute', () => {
    expect(elapsedMinutes(89_000)).toBe(1);
    expect(elapsedMinutes(90_000)).toBe(2);
  });

  it('calculates a non-negative elapsed time from a rowing date', () => {
    expect(elapsedSince('2026-08-21T10:00:00.000Z', Date.parse('2026-08-21T10:42:30.000Z'))).toBe(2_550_000);
    expect(elapsedSince('invalid', Date.now())).toBe(0);
  });
});
