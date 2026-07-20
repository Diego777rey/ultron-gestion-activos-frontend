import { ChangeDetectionStrategy, Component, TemplateRef, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellContext, TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { ProductoService } from '../../services/producto.service';
import { PresentacionProductoService } from '../../services/presentacion-producto.service';
import { ProductoOutput, PresentacionProductoOutput } from '../../interfaces/producto.interface';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { ProductoFormComponent } from '../../dialogs/producto-form/producto-form.component';
import { PresentacionFormComponent } from '../../dialogs/presentacion-form/presentacion-form.component';
import { StockSectoresDialogComponent } from '../../dialogs/stock-sectores-dialog/stock-sectores-dialog.component';

@Component({
  selector: 'app-productos-list',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
    UiButtonComponent,
  ],
  templateUrl: './productos-list.component.html',
  styleUrl: './productos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class ProductosListComponent {
  private readonly productoService = inject(ProductoService);
  private readonly presentacionService = inject(PresentacionProductoService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly presentacionesTemplate = viewChild<TemplateRef<TableCellContext<ProductoOutput>>>('presTpl');

  protected readonly productos = signal<ProductoOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<ProductoOutput>[] = [
    { key: 'codigo', header: 'Código', width: '120px' },
    { key: 'nombre', header: 'Nombre', width: '250px' },
    { key: 'categoria', header: 'Categoría', width: '220px' },
    { key: 'presentaciones', header: 'Presentaciones', width: '120px', align: 'center' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Adicionar' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'stock', label: 'Ver Stock', icon: 'inventory_2' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.productoService.findPaginated(this.pageIndex(), this.pageSize(), this.search()).subscribe({
      next: (response) => {
        this.productos.set(response.content);
        this.totalElements.set(response.pageInfo.totalElements);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo conectar con el servidor');
        this.loading.set(false);
      },
    });
  }

  protected presentacionesDe(producto: ProductoOutput): PresentacionProductoOutput[] {
    return producto.presentaciones ?? [];
  }

  protected categoriaLabel(producto: ProductoOutput): string {
    const cat = producto.categoriaProducto;
    if (!cat) {
      return '';
    }
    return cat.categoriaPadre ? `${cat.categoriaPadre.nombre} › ${cat.nombre}` : cat.nombre;
  }

  protected onPageChange(event: PageChange): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'search':
        this.pageIndex.set(0);
        this.load();
        break;
      case 'clear':
        this.search.set('');
        this.pageIndex.set(0);
        this.load();
        break;
      case 'add':
        this.openNewDialog();
        break;
    }
  }

  protected openNewDialog(): void {
    this.dialogService.openForm(ProductoFormComponent, {
      title: 'Nuevo Producto',
      subtitle: 'Completa los datos para registrar un producto',
      maxWidth: '760px',
    }).subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  protected openEditDialog(producto: ProductoOutput): void {
    this.dialogService.openForm(ProductoFormComponent, {
      title: 'Editar Producto',
      subtitle: 'Modifica los datos del producto',
      maxWidth: '760px',
      inputs: { producto },
    }).subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  protected onRowAction(actionId: string, producto: ProductoOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(producto);
    } else if (actionId === 'stock') {
      this.openStockDialog(producto);
    }
  }

  protected openStockDialog(producto: ProductoOutput): void {
    this.dialogService.openForm(StockSectoresDialogComponent, {
      title: 'Stock por Sectores',
      subtitle: producto.nombre,
      maxWidth: '640px',
      inputs: { producto },
    }).subscribe();
  }

  protected openPresentacionForm(producto: ProductoOutput, presentacion?: PresentacionProductoOutput, event?: Event): void {
    event?.stopPropagation();
    this.dialogService.openForm(PresentacionFormComponent, {
      title: presentacion ? 'Editar Presentación' : 'Nueva Presentación',
      subtitle: producto.nombre,
      maxWidth: '640px',
      inputs: { idProducto: producto.id_producto, presentacion: presentacion ?? null },
    }).subscribe((saved) => {
      if (saved) {
        this.recargarPresentaciones(producto.id_producto);
      }
    });
  }

  protected eliminarPresentacion(producto: ProductoOutput, presentacion: PresentacionProductoOutput, event?: Event): void {
    event?.stopPropagation();
    if (!presentacion.id_presentacion_producto) {
      return;
    }
    this.presentacionService.remove(presentacion.id_presentacion_producto).subscribe({
      next: () => this.recargarPresentaciones(producto.id_producto),
      error: (err: Error) => this.error.set(err.message || 'No se pudo eliminar la presentación'),
    });
  }

  private recargarPresentaciones(idProducto: number): void {
    this.presentacionService.findByProducto(idProducto).subscribe({
      next: (presentaciones) => {
        this.productos.update((list) =>
          list.map((p) => (p.id_producto === idProducto ? { ...p, presentaciones } : p))
        );
      },
    });
  }

  protected trackById = (p: ProductoOutput): unknown => p.id_producto;
}
