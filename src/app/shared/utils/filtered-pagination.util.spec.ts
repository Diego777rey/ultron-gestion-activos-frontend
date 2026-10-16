import { signal } from '@angular/core';
import { createFilteredPagination } from './filtered-pagination.util';

interface Item {
  id: number;
  nombre: string;
  activo: boolean;
}

describe('createFilteredPagination', () => {
  const crearItems = (n: number): Item[] =>
    Array.from({ length: n }, (_, i) => ({ id: i + 1, nombre: `Item ${i + 1}`, activo: true }));

  const crear = (items: Item[], pageSize = 15) => {
    const source = signal(items);
    const lista = createFilteredPagination(source, {
      visible: (item) => item.activo,
      matches: (item, term) => item.nombre.toLowerCase().includes(term),
      pageSize,
    });
    return { source, lista };
  };

  it('oculta los elementos no visibles aunque no haya búsqueda', () => {
    const { lista } = crear([
      { id: 1, nombre: 'Uno', activo: true },
      { id: 2, nombre: 'Dos', activo: false },
    ]);
    expect(lista.filtered().map((i) => i.id)).toEqual([1]);
  });

  it('busca con el término recortado y en minúsculas, y vuelve a la primera página', () => {
    const { lista } = crear(crearItems(40), 15);
    lista.nextPage();
    expect(lista.pageIndex()).toBe(1);

    lista.setSearch('  ITEM 3 ');
    expect(lista.pageIndex()).toBe(0);
    expect(lista.filtered().map((i) => i.id)).toEqual([3, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39]);
  });

  it('pagina y arma el texto del rango', () => {
    const { lista } = crear(crearItems(40), 15);
    expect(lista.paged().length).toBe(15);
    expect(lista.totalPages()).toBe(3);
    expect(lista.rangeLabel()).toBe('1 - 15 de 40');

    lista.nextPage();
    lista.nextPage();
    expect(lista.paged().map((i) => i.id)).toEqual([31, 32, 33, 34, 35, 36, 37, 38, 39, 40]);
    expect(lista.rangeLabel()).toBe('31 - 40 de 40');

    lista.previousPage();
    expect(lista.rangeLabel()).toBe('16 - 30 de 40');
  });

  it('informa rango vacío y al menos una página cuando no hay resultados', () => {
    const { lista } = crear([]);
    expect(lista.totalPages()).toBe(1);
    expect(lista.rangeLabel()).toBe('0 - 0 de 0');
  });

  it('reset limpia la búsqueda y la página', () => {
    const { lista } = crear(crearItems(40), 15);
    lista.setSearch('item');
    lista.nextPage();
    lista.reset();
    expect(lista.search()).toBe('');
    expect(lista.pageIndex()).toBe(0);
  });
});
