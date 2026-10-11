import { computed, Signal, signal } from '@angular/core';
import { createListPagination, ListPaginationState } from './list-pagination.util';

export interface FilteredPaginationOptions<T> {
  /** Recibe el término ya recortado y en minúsculas. */
  matches: (item: T, term: string) => boolean;
  /** Elementos que se muestran aunque no haya búsqueda. */
  visible?: (item: T) => boolean;
  pageSize?: number;
}

export interface FilteredPaginationState<T> extends ListPaginationState<T> {
  search: Signal<string>;
  filtered: Signal<readonly T[]>;
  totalPages: Signal<number>;
  /** Texto del tipo "1 - 15 de 40". */
  rangeLabel: Signal<string>;
  setSearch: (value: string) => void;
  reset: () => void;
  previousPage: () => void;
  nextPage: () => void;
}

/** Estado de búsqueda y paginación local para listados cargados en memoria. */
export function createFilteredPagination<T>(
  source: Signal<readonly T[]>,
  options: FilteredPaginationOptions<T>
): FilteredPaginationState<T> {
  const search = signal('');
  const filtered = computed(() => {
    const term = search().trim().toLowerCase();
    const list = options.visible ? source().filter(options.visible) : source();
    return term ? list.filter((item) => options.matches(item, term)) : list;
  });
  const pagination = createListPagination(filtered, options.pageSize);
  const { pageIndex, pageSize, total } = pagination;

  const totalPages = computed(() => Math.max(1, Math.ceil(total() / pageSize())));
  const rangeLabel = computed(() => {
    if (total() === 0) {
      return '0 - 0 de 0';
    }
    const start = pageIndex() * pageSize() + 1;
    const end = Math.min((pageIndex() + 1) * pageSize(), total());
    return `${start} - ${end} de ${total()}`;
  });

  return {
    ...pagination,
    search,
    filtered,
    totalPages,
    rangeLabel,
    setSearch: (value: string) => {
      search.set(value);
      pageIndex.set(0);
    },
    reset: () => {
      search.set('');
      pageIndex.set(0);
    },
    previousPage: () => pageIndex.update((page) => page - 1),
    nextPage: () => pageIndex.update((page) => page + 1),
  };
}
