import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { CategoriaProductoService } from '../../services/categoria-producto.service';
import { CategoriaProductoOutput } from '../../interfaces/producto.interface';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { CategoriaProductoFormComponent } from '../../dialogs/categoria-producto-form/categoria-producto-form.component';

@Component({
  selector: 'app-categoria-producto-list',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
  ],
  templateUrl: './categoria-producto-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class CategoriaProductoListComponent {
  private readonly categoriaService = inject(CategoriaProductoService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly categorias = signal<CategoriaProductoOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<CategoriaProductoOutput>[] = [
    { key: 'nombre', header: 'Nombre', width: '250px' },
    { key: 'descripcion', header: 'Descripción', width: '350px' },
    { key: 'estado', header: 'Estado', width: '100px' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Adicionar' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.categoriaService.findPaginated(this.pageIndex(), this.pageSize(), this.search()).subscribe({
      next: (response) => {
        this.categorias.set(response.content);
        this.totalElements.set(response.pageInfo.totalElements);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo conectar con el servidor');
        this.loading.set(false);
      },
    });
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
    this.dialogService.openForm(CategoriaProductoFormComponent, {
      title: 'Nueva Categoría de Producto',
      subtitle: 'Completa los datos para registrar una categoría',
      maxWidth: '600px',
    }).subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  protected openEditDialog(categoria: CategoriaProductoOutput): void {
    this.dialogService.openForm(CategoriaProductoFormComponent, {
      title: 'Editar Categoría',
      subtitle: 'Modifica los datos de la categoría',
      maxWidth: '600px',
      inputs: { categoria },
    }).subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  protected onRowAction(actionId: string, categoria: CategoriaProductoOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(categoria);
    }
  }

  protected trackById = (c: CategoriaProductoOutput): unknown => c.id_categoria_producto;
}
