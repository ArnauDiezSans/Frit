export function isNoLlistaType(value: string | null | undefined): boolean {
  return normalizeGameType(value).includes('no llista');
}

export function isCooperativeType(value: string | null | undefined): boolean {
  return normalizeGameType(value).includes('cooperatiu');
}

export function isTeamsType(value: string | null | undefined): boolean {
  return normalizeGameType(value).includes('equips');
}

function normalizeGameType(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}
