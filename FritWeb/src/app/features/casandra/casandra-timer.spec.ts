import { approximationLevel, crossedLevels, elapsedProgress, restoreState, tickRemaining } from './casandra-timer';

describe('Casandra timer', () => {
  it('divides the duration into six equal levels', () => {
    expect(approximationLevel(6000, 6000)).toBe(0);
    expect(approximationLevel(6000, 5000)).toBe(1);
    expect(approximationLevel(6000, 1000)).toBe(5);
    expect(approximationLevel(6000, 0)).toBe(6);
  });

  it('reports every crossed threshold', () => {
    expect(crossedLevels(6000, 5500, 3500)).toEqual([1, 2]);
    expect(crossedLevels(6000, 3500, 5500)).toEqual([]);
  });

  it('uses wall clock time without accumulating interval drift', () => {
    expect(tickRemaining(10000, 1000, 3500)).toBe(7500);
  });

  it('supports manual progress', () => {
    expect(elapsedProgress(10000, 2500)).toBe(0.75);
  });

  it('restores and advances a running saved session', () => {
    const state = restoreState(JSON.stringify({ totalMs: 10000, remainingMs: 8000, running: true, lastStartedAt: 1000 }), 4000);
    expect(state.remainingMs).toBe(5000);
    expect(state.running).toBeTrue();
    expect(state.lastStartedAt).toBe(4000);
  });
});
