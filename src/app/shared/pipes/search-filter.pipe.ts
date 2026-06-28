import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe genérico para filtrar una colección por un término de búsqueda.
 * Busca, sin distinción de mayúsculas/acentos, en las propiedades indicadas
 * (o en todas si no se especifican). Reutilizable en cualquier listado.
 *
 * Uso: `items | searchFilter:term:['nombre','documento']`
 */
@Pipe({ name: 'searchFilter' })
export class SearchFilterPipe implements PipeTransform {
  transform<T>(items: readonly T[] | null | undefined, term: string, keys?: string[]): T[] {
    if (!items) {
      return [];
    }
    const needle = this.normalize(term);
    if (!needle) {
      return [...items];
    }
    return items.filter((item) => this.matches(item, needle, keys));
  }

  private matches<T>(item: T, needle: string, keys?: string[]): boolean {
    if (item == null) {
      return false;
    }
    if (typeof item !== 'object') {
      return this.normalize(String(item)).includes(needle);
    }
    const record = item as Record<string, unknown>;
    const values = keys?.length
      ? keys.map((k) => this.resolve(record, k))
      : this.flatten(record);
    return values.some((value) => this.normalize(this.stringify(value)).includes(needle));
  }

  /** Resuelve rutas anidadas tipo 'persona.nombre'. */
  private resolve(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /** Aplana recursivamente los valores escalares de un objeto. */
  private flatten(value: unknown): unknown[] {
    if (value == null) {
      return [];
    }
    if (typeof value !== 'object') {
      return [value];
    }
    return Object.values(value as Record<string, unknown>).flatMap((v) => this.flatten(v));
  }

  private stringify(value: unknown): string {
    return value == null ? '' : String(value);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
