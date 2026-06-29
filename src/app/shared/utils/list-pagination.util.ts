import { computed, Signal, signal, WritableSignal } from '@angular/core';
import { PageChange } from '../models/pagination.model';

/** Devuelve un subconjunto paginado de una colección. */
export function paginateItems<T>(
  items: readonly T[],
  pageIndex: number,
  pageSize: number
): readonly T[] {
  const start = pageIndex * pageSize;
  return items.slice(start, start + pageSize);
}

export interface ListPaginationState<T> {
  pageIndex: WritableSignal<number>;
  pageSize: WritableSignal<number>;
  total: Signal<number>;
  paged: Signal<readonly T[]>;
  onPageChange: (event: PageChange) => void;
  resetPage: () => void;
}

/** Estado reutilizable de paginación para listados con filtrado previo. */
export function createListPagination<T>(
  source: Signal<readonly T[]>,
  initialPageSize = 15
): ListPaginationState<T> {
  const pageIndex = signal(0);
  const pageSize = signal(initialPageSize);
  const total = computed(() => source().length);
  const paged = computed(() => paginateItems(source(), pageIndex(), pageSize()));

  return {
    pageIndex,
    pageSize,
    total,
    paged,
    onPageChange: (event: PageChange) => {
      pageIndex.set(event.pageIndex);
      pageSize.set(event.pageSize);
    },
    resetPage: () => pageIndex.set(0),
  };
}
