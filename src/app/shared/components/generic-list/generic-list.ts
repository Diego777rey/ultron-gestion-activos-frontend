import { ChangeDetectionStrategy, Component, contentChildren, input, model, output, TemplateRef } from '@angular/core';
import { UiButtonComponent } from '../ui-button/ui-button';
import { DataTableComponent } from '../data-table/data-table';
import { TableCellContext, TableCellDirective } from '../data-table/table-cell.directive';
import { PaginatorComponent } from '../paginator/paginator';
import { TableColumn } from '../../models/table-column.model';
import { PageChange } from '../../models/pagination.model';
import { ListToolbarAction } from '../../models/list-toolbar-action.model';

let searchInputCounter = 0;

/**
 * Layout reutilizable para pantallas de listado CRUD.
 * Encapsula filtros, barra de acciones, tabla, paginador y alerta de error.
 *
 * Proyección de contenido:
 * - `[genericListFilters]` — filtros personalizados (reemplaza el campo de búsqueda por defecto).
 * - `[genericListActions]` — botones personalizados (reemplaza `toolbarActions`).
 * - Plantillas `appTableCell` — celdas personalizadas de la tabla.
 *
 * El componente padre del listado debe usar `host: { class: 'app-list-view' }`.
 * Los modales u overlays van como hermanos de `app-generic-list`, no proyectados dentro.
 */
@Component({
  selector: 'app-generic-list',
  imports: [UiButtonComponent, DataTableComponent, PaginatorComponent],
  templateUrl: './generic-list.html',
  styleUrl: './generic-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'generic-list-host' },
})
export class GenericListComponent<T = Record<string, unknown>> {
  protected readonly cellTemplates = contentChildren(TableCellDirective);

  readonly columns = input.required<TableColumn<T>[]>();
  readonly data = input<readonly T[]>([]);
  readonly loading = input<boolean>(false);
  readonly emptyMessage = input<string>('No se encontraron registros');
  readonly trackBy = input<(row: T) => unknown>((row) => row);

  readonly total = input.required<number>();
  readonly pageIndex = input<number>(0);
  readonly pageSize = input<number>(15);
  readonly pageSizeOptions = input<number[]>([15, 25, 50, 100]);
  readonly pageChange = output<PageChange>();

  readonly error = input<string | null>(null);
  readonly retry = output<void>();

  /** Si se define, muestra el campo de búsqueda estándar con esta etiqueta. */
  readonly searchLabel = input<string | undefined>(undefined);
  readonly searchValue = model<string>('');
  readonly searchSubmit = output<string>();

  readonly toolbarActions = input<ListToolbarAction[]>([]);
  readonly actionClicked = output<string>();

  /** Plantilla para el contenido expandible de cada fila. */
  readonly expandTemplate = input<TemplateRef<TableCellContext<T>> | null>(null);

  protected readonly searchInputId = `generic-list-search-${++searchInputCounter}`;

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchValue.set(value);
  }

  protected onSearchEnter(): void {
    this.searchSubmit.emit(this.searchValue());
  }

  protected onActionClick(actionId: string): void {
    this.actionClicked.emit(actionId);
  }

  protected onRetry(): void {
    this.retry.emit();
  }
}
