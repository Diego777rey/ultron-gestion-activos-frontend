/** Normaliza texto para búsquedas sin distinción de mayúsculas ni acentos. */
export function normalizeSearchTerm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
