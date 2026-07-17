import { ChangeDetectionStrategy, Component, inject, signal, viewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellContext, TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { CategoriaServicioService } from '../../services/categoria-servicio.service';
import { CategoriaServicioOutput } from '../../interfaces/servicio.interface';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { SubcategoriaServicioFormComponent } from '../../dialogs/subcategoria-servicio-form/subcategoria-servicio-form.component';

@Component({
  selector: 'app-categoria-servicio-list',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
  ],
  templateUrl: './categoria-servicio-list.component.html',
  styleUrl: './categoria-servicio-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class CategoriaServicioListComponent {
  private readonly categoriaService = inject(CategoriaServicioService);
  private readonly router = inject(Router);
  private readonly dialogService = inject(AppDialogService);

  protected readonly subcatTemplate = viewChild<TemplateRef<TableCellContext<CategoriaServicioOutput>>>('subcatTpl');

  protected readonly categorias = signal<CategoriaServicioOutput[]>([]);
  protected readonly subcatMap = signal<Record<number, CategoriaServicioOutput[]>>({});
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<CategoriaServicioOutput>[] = [
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

  private cargarSubcategorias(categorias: CategoriaServicioOutput[]): void {
    this.subcatMap.set({});
    for (const cat of categorias) {
      const id = cat.id_categoria_servicio;
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

  protected subcategoriasDe(cat: CategoriaServicioOutput): CategoriaServicioOutput[] {
    const id = cat.id_categoria_servicio;
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
        this.router.navigate(['/inventario/servicios/categorias/nueva']);
        break;
    }
  }

  protected onRowAction(actionId: string, categoria: CategoriaServicioOutput): void {
    if (!categoria.id_categoria_servicio) {
      return;
    }
    if (actionId === 'edit') {
      this.router.navigate(['/inventario/servicios/categorias', categoria.id_categoria_servicio, 'editar']);
    } else if (actionId === 'add_sub') {
      this.agregarSubcategoria(categoria);
    }
  }

  protected agregarSubcategoria(categoria: CategoriaServicioOutput): void {
    if (!categoria.id_categoria_servicio) {
      return;
    }
    const id = categoria.id_categoria_servicio;
    this.dialogService.openForm(SubcategoriaServicioFormComponent, {
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

  protected trackById = (c: CategoriaServicioOutput): unknown => c.id_categoria_servicio;
}
