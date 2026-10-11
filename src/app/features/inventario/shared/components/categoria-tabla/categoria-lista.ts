import { Signal } from '@angular/core';
import {
  createFilteredPagination,
  FilteredPaginationState,
} from '../../../../../shared/utils/filtered-pagination.util';
import { CategoriaTablaItem } from './categoria-tabla.component';

export interface CategoriaListaItem extends CategoriaTablaItem {
  descripcion?: string;
}

/** Lista de categorías activas con búsqueda por nombre, id o descripción. */
export function crearListaCategorias<T extends CategoriaListaItem>(
  source: Signal<readonly T[]>,
  idDe: (item: T) => number | undefined
): FilteredPaginationState<T> {
  return createFilteredPagination(source, {
    visible: (c) => c.estado !== false,
    matches: (c, q) =>
      c.nombre.toLowerCase().includes(q) ||
      String(idDe(c) ?? '').includes(q) ||
      (c.descripcion ?? '').toLowerCase().includes(q),
  });
}
