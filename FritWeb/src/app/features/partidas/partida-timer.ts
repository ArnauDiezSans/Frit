export function formatPartidaTimer(elapsedMilliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMilliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${mm}:${ss}`
    : `${mm}:${ss}`;
}

export function elapsedMinutes(elapsedMilliseconds: number): number {
  return Math.max(0, Math.round(elapsedMilliseconds / 60000));
}

export function elapsedSince(isoDate: string, nowMilliseconds = Date.now()): number {
  const startedAt = new Date(isoDate).getTime();
  return Number.isNaN(startedAt) ? 0 : Math.max(0, nowMilliseconds - startedAt);
}
