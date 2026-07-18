import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { PresentacionService } from '../../services/presentacion.service';
import { PresentacionOutput } from '../../interfaces/presentacion.interface';
import { PresentacionCatalogoFormComponent } from '../../dialogs/presentacion-catalogo-form/presentacion-catalogo-form.component';

@Component({
  selector: 'app-presentaciones-list',
  imports: [
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './presentaciones-list.component.html',
  styleUrl: './presentaciones-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class PresentacionesListComponent {
  private readonly presentacionService = inject(PresentacionService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly presentaciones = signal<PresentacionOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<PresentacionOutput>[] = [
    { key: 'nombre', header: 'Nombre', width: '240px' },
    { key: 'descripcion', header: 'Descripción', width: '320px' },
    { key: 'estado', header: 'Estado', width: '120px' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Adicionar' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'delete', label: 'Eliminar', icon: 'delete', danger: true },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.presentacionService.findPaginated(this.pageIndex(), this.pageSize(), this.search()).subscribe({
      next: (response) => {
        this.presentaciones.set(response.content);
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
    this.dialogService
      .openForm(PresentacionCatalogoFormComponent, {
        title: 'Nueva Presentación',
        subtitle: 'Registrá un tipo de presentación (unidad, pack, caja, etc.)',
        maxWidth: '640px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected openEditDialog(presentacion: PresentacionOutput): void {
    this.dialogService
      .openForm(PresentacionCatalogoFormComponent, {
        title: 'Editar Presentación',
        subtitle: 'Modificá los datos de la presentación',
        maxWidth: '640px',
        inputs: { presentacion },
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected onRowAction(actionId: string, presentacion: PresentacionOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(presentacion);
      return;
    }
    if (actionId === 'delete' && presentacion.id_presentacion != null) {
      this.presentacionService.remove(presentacion.id_presentacion).subscribe({
        next: () => this.load(),
        error: (err: Error) => this.error.set(err.message || 'No se pudo eliminar la presentación'),
      });
    }
  }

  protected trackById = (p: PresentacionOutput): unknown => p.id_presentacion;
}
