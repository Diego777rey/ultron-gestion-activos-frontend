// Punto único de exportación de los elementos genéricos reutilizables.

// Modelos
export * from './models/table-column.model';
export * from './models/pagination.model';
export * from './models/crud-config.model';
export * from './models/menu-item.model';
export * from './models/list-toolbar-action.model';

// Servicios genéricos
export * from './services/graphql.service';
export * from './services/base-crud.service';

// Pipes
export * from './pipes/search-filter.pipe';
export * from './pipes/default-empty.pipe';

// Directivas
export * from './directives/click-outside.directive';
export * from './directives/autofocus.directive';
export * from './directives/uppercase.directive';

// Componentes genéricos
export * from './components/ui-button/ui-button';
export * from './components/page-header/page-header';
export * from './components/search-bar/search-bar';
export * from './components/data-table/data-table';
export * from './components/data-table/table-cell.directive';
export * from './components/paginator/paginator';
export * from './components/modal/modal';
export * from './components/action-menu/action-menu';
export * from './components/generic-list/generic-list';


// Utilidades
export * from './utils/list-pagination.util';
export * from './utils/search.util';
