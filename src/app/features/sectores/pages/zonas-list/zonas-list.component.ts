import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { GenericListComponent } from '../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../shared/services/app-dialog.service';
import { ZonaService } from '../../services/zona.service';
import { ZonaOutput } from '../../interfaces/zona.interface';
import { ZonaFormComponent } from '../../dialogs/zona-form/zona-form.component';

@Component({
  selector: 'app-zonas-list',
  imports: [
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './zonas-list.component.html',
  styleUrl: './zonas-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class ZonasListComponent {
  private readonly zonaService = inject(ZonaService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly zonas = signal<ZonaOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<ZonaOutput>[] = [
    { key: 'nombre', header: 'Nombre', width: '240px' },
    { key: 'sector', header: 'Sector', width: '240px' },
    { key: 'descripcion', header: 'Descripción', width: '280px' },
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
    this.zonaService.findPaginated(this.pageIndex(), this.pageSize(), this.search()).subscribe({
      next: (response) => {
        this.zonas.set(response.content);
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
      .openForm(ZonaFormComponent, {
        title: 'Nueva Zona',
        subtitle: 'Registrá una zona dentro de un sector',
        maxWidth: '640px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected openEditDialog(zona: ZonaOutput): void {
    this.dialogService
      .openForm(ZonaFormComponent, {
        title: 'Editar Zona',
        subtitle: 'Modificá los datos de la zona',
        maxWidth: '640px',
        inputs: { zona },
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected onRowAction(actionId: string, zona: ZonaOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(zona);
      return;
    }
    if (actionId === 'delete' && zona.id_zona != null) {
      this.zonaService.remove(zona.id_zona).subscribe({
        next: () => this.load(),
        error: (err: Error) => this.error.set(err.message || 'No se pudo eliminar la zona'),
      });
    }
  }

  protected trackById = (z: ZonaOutput): unknown => z.id_zona;
}
