import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GenericListComponent } from '../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../shared/models/pagination.model';
import { CompraOutput } from '../../../../shared/models/compras.model';
import { CompraService } from '../../../../shared/services/compra.service';
import { AppDialogService } from '../../../../shared/services/app-dialog.service';
import {
  coincideCompra,
  etiquetaEstadoCompra,
  fechaCorta,
  formatMonto,
} from '../../shared/compra-presentacion';

@Component({
  selector: 'app-compras-list',
  imports: [GenericListComponent, TableCellDirective, ActionMenuComponent, DefaultEmptyPipe],
  templateUrl: './compras-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class ComprasListComponent {
  private readonly compraService = inject(CompraService);
  private readonly dialogService = inject(AppDialogService);
  private readonly router = inject(Router);

  protected readonly compras = signal<CompraOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);

  protected readonly filtrados = computed(() => {
    const consulta = this.search().trim().toLowerCase();
    const items = this.compras();
    if (!consulta) {
      return items;
    }
    return items.filter((compra) => coincideCompra(compra, consulta));
  });

  protected readonly visibles = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtrados().slice(start, start + this.pageSize());
  });

  protected readonly total = computed(() => this.filtrados().length);

  protected readonly columns: TableColumn<CompraOutput>[] = [
    { key: 'id', header: 'Id', width: '80px', align: 'center' },
    { key: 'fecha', header: 'Fecha', width: '120px' },
    { key: 'proveedor', header: 'Proveedor' },
    { key: 'factura', header: 'N° factura', width: '140px' },
    { key: 'moneda', header: 'Moneda', width: '100px', align: 'center' },
    { key: 'total', header: 'Total', width: '140px', align: 'right' },
    { key: 'estado', header: 'Estado', width: '120px', align: 'center' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Agregar' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'delete', label: 'Eliminar', icon: 'delete' },
  ];

  protected readonly fecha = fechaCorta;
  protected readonly estado = etiquetaEstadoCompra;
  protected readonly monto = formatMonto;
  protected readonly trackById = (compra: CompraOutput): unknown => compra.id_compra;

  constructor() {
    effect(() => {
      const total = this.filtrados().length;
      const maxPage = Math.max(0, Math.ceil(total / this.pageSize()) - 1);
      if (this.pageIndex() > maxPage) {
        this.pageIndex.set(maxPage);
      }
    });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.compraService.findAll(true).subscribe({
      next: (compras) => {
        this.compras.set(compras);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo conectar con el servidor');
        this.loading.set(false);
      },
    });
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.pageIndex.set(0);
  }

  protected onPageChange(event: PageChange): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'search':
        this.pageIndex.set(0);
        break;
      case 'clear':
        this.search.set('');
        this.pageIndex.set(0);
        break;
      case 'add':
        void this.router.navigate(['/compras/nueva']);
        break;
    }
  }

  protected onRowAction(actionId: string, compra: CompraOutput): void {
    if (actionId === 'edit') {
      void this.router.navigate(['/compras/editar', compra.id_compra]);
      return;
    }
    if (actionId === 'delete') {
      this.confirmDelete(compra);
    }
  }

  private confirmDelete(compra: CompraOutput): void {
    const factura = compra.numero_factura?.trim() || `compra #${compra.id_compra}`;
    this.dialogService.confirm(`¿Eliminar la ${factura}?`).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.compraService.remove(compra.id_compra).subscribe({
        next: (ok) => {
          if (ok) {
            this.load();
          }
        },
      });
    });
  }
}
