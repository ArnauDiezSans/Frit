import { CasandraState, DEFAULT_CASANDRA_STATE } from './casandra.models';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function elapsedProgress(totalMs: number, remainingMs: number): number {
  if (totalMs <= 0) return 0;
  return clamp((totalMs - remainingMs) / totalMs, 0, 1);
}

export function approximationLevel(totalMs: number, remainingMs: number): number {
  const progress = elapsedProgress(totalMs, remainingMs);
  return progress >= 1 ? 6 : Math.floor(progress * 6);
}

export function crossedLevels(totalMs: number, beforeMs: number, afterMs: number): number[] {
  if (afterMs >= beforeMs) return [];
  const before = approximationLevel(totalMs, beforeMs);
  const after = approximationLevel(totalMs, afterMs);
  return Array.from({ length: Math.max(0, after - before) }, (_, index) => before + index + 1);
}

export function tickRemaining(remainingMs: number, lastStartedAt: number, now: number): number {
  return clamp(remainingMs - Math.max(0, now - lastStartedAt), 0, Number.MAX_SAFE_INTEGER);
}

export function restoreState(raw: string | null, now = Date.now()): CasandraState {
  if (!raw) return { ...DEFAULT_CASANDRA_STATE };
  try {
    const value = { ...DEFAULT_CASANDRA_STATE, ...JSON.parse(raw) } as CasandraState;
    value.totalMs = clamp(Number(value.totalMs) || DEFAULT_CASANDRA_STATE.totalMs, 1000, 24 * 60 * 60 * 1000);
    value.remainingMs = clamp(Number(value.remainingMs), 0, value.totalMs);
    value.integrity = clamp(Math.round(Number(value.integrity) || 0), 0, 7);
    value.resonance = clamp(Math.round(Number(value.resonance) || 0), 0, 6);
    value.shownEvents = Array.isArray(value.shownEvents) ? value.shownEvents.filter(n => n >= 1 && n <= 6) : [];
    if (value.running && value.lastStartedAt) {
      value.remainingMs = tickRemaining(value.remainingMs, value.lastStartedAt, now);
      value.lastStartedAt = now;
      value.running = value.remainingMs > 0;
    }
    return value;
  } catch {
    return { ...DEFAULT_CASANDRA_STATE };
  }
}
