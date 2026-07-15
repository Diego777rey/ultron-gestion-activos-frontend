import { ChangeDetectionStrategy, Component, inject, signal, viewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellContext, TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { CategoriaProductoService } from '../../services/categoria-producto.service';
import { CategoriaProductoOutput } from '../../interfaces/producto.interface';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { SubcategoriaFormComponent } from '../../dialogs/subcategoria-form/subcategoria-form.component';

@Component({
  selector: 'app-categoria-producto-list',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
  ],
  templateUrl: './categoria-producto-list.component.html',
  styleUrl: './categoria-producto-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class CategoriaProductoListComponent {
  private readonly categoriaService = inject(CategoriaProductoService);
  private readonly router = inject(Router);
  private readonly dialogService = inject(AppDialogService);

  protected readonly subcatTemplate = viewChild<TemplateRef<TableCellContext<CategoriaProductoOutput>>>('subcatTpl');

  protected readonly categorias = signal<CategoriaProductoOutput[]>([]);
  protected readonly subcatMap = signal<Record<number, CategoriaProductoOutput[]>>({});
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<CategoriaProductoOutput>[] = [
    { key: 'nombre', header: 'Nombre', width: '250px' },
    { key: 'descripcion', header: 'Descripción', width: '350px' },
    { key: 'subcategorias', header: 'Subcategorías', width: '120px', align: 'center' },
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
    { id: 'add_sub', label: 'Agregar subcategoría', icon: 'account_tree' },
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
        this.cargarSubcategorias(response.content);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo conectar con el servidor');
        this.loading.set(false);
      },
    });
  }

  private cargarSubcategorias(categorias: CategoriaProductoOutput[]): void {
    this.subcatMap.set({});
    for (const cat of categorias) {
      const id = cat.id_categoria_producto;
      if (!id) {
        continue;
      }
      this.categoriaService.findSubcategorias(id).subscribe({
        next: (subs) => {
          this.subcatMap.update((map) => ({ ...map, [id]: subs }));
        },
      });
    }
  }

  protected subcategoriasDe(cat: CategoriaProductoOutput): CategoriaProductoOutput[] {
    const id = cat.id_categoria_producto;
    return id ? (this.subcatMap()[id] ?? []) : [];
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
        this.router.navigate(['/inventario/productos/categorias/nueva']);
        break;
    }
  }

  protected onRowAction(actionId: string, categoria: CategoriaProductoOutput): void {
    if (!categoria.id_categoria_producto) {
      return;
    }
    if (actionId === 'edit') {
      this.router.navigate(['/inventario/productos/categorias', categoria.id_categoria_producto, 'editar']);
    } else if (actionId === 'add_sub') {
      this.agregarSubcategoria(categoria);
    }
  }

  protected agregarSubcategoria(categoria: CategoriaProductoOutput): void {
    if (!categoria.id_categoria_producto) {
      return;
    }
    const id = categoria.id_categoria_producto;
    this.dialogService.openForm(SubcategoriaFormComponent, {
      title: 'Nueva Subcategoría',
      subtitle: categoria.nombre,
      maxWidth: '560px',
      inputs: { idCategoriaPadre: id, nombrePadre: categoria.nombre },
    }).subscribe((saved) => {
      if (saved) {
        this.recargarSubcategorias(id);
      }
    });
  }

  private recargarSubcategorias(idPadre: number): void {
    this.categoriaService.findSubcategorias(idPadre).subscribe({
      next: (subs) => this.subcatMap.update((map) => ({ ...map, [idPadre]: subs })),
    });
  }

  protected trackById = (c: CategoriaProductoOutput): unknown => c.id_categoria_producto;
}
