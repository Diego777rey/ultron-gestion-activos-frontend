import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import {
  ActionMenuComponent,
  MenuAction,
} from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { RoleService } from '../../services/role.service';
import { RoleOutput } from '../../interfaces/role.interface';
import { RoleFormComponent } from '../../dialogs/role-form/role-form';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';

@Component({
  selector: 'app-roles-list',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './roles-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class RolesListComponent {
  private readonly roleService = inject(RoleService);

  protected readonly roles = signal<RoleOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<RoleOutput>[] = [
    { key: 'id', header: 'Id', width: '80px', align: 'center' },
    { key: 'descripcion', header: 'Descripción', width: '320px' },
    { key: 'activo', header: 'Estado', width: '120px', align: 'center' },
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
    this.roleService.findPaginated(this.pageIndex(), this.pageSize()).subscribe({
      next: (response) => {
        this.roles.set(response.content);
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

  private readonly dialogService = inject(AppDialogService);

  protected openNewDialog(): void {
    this.dialogService.openForm(RoleFormComponent, {
      title: 'Nuevo Rol',
      subtitle: 'Completa los datos para registrar un rol',
      maxWidth: '560px',
    }).subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  protected openEditDialog(role: RoleOutput): void {
    this.dialogService.openForm(RoleFormComponent, {
      title: 'Editar Rol',
      subtitle: 'Modifica los datos del rol',
      maxWidth: '560px',
      inputs: { role },
    }).subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  protected onRowAction(actionId: string, role: RoleOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(role);
    }
  }

  protected trackById = (r: RoleOutput): unknown => r.id;
}
