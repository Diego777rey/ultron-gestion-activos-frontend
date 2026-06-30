import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import {
  ActionMenuComponent,
  MenuAction,
} from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { UsuarioService } from '../../services/usuario.service';
import { UsuarioOutput } from '../../interfaces/usuario.interface';
import { UsuarioFormComponent } from '../../dialogs/usuario-form/usuario-form';

@Component({
  selector: 'app-usuarios-list',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
    ModalComponent,
    UsuarioFormComponent,
  ],
  templateUrl: './usuarios-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class UsuariosListComponent {
  private readonly usuarioService = inject(UsuarioService);

  protected readonly usuarios = signal<UsuarioOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly selectedUsuario = signal<UsuarioOutput | null>(null);

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly dialogTitle = computed(() =>
    this.selectedUsuario() ? 'Editar Usuario' : 'Nuevo Usuario'
  );

  protected readonly dialogSubtitle = computed(() =>
    this.selectedUsuario()
      ? 'Modifica los datos del usuario'
      : 'Completa los datos para registrar un usuario'
  );

  protected readonly columns: TableColumn<UsuarioOutput>[] = [
    { key: 'id', header: 'Id', width: '80px', align: 'center' },
    { key: 'username', header: 'Usuario', width: '160px' },
    { key: 'funcionario', header: 'Funcionario', width: '220px' },
    { key: 'roles', header: 'Roles', width: '220px' },
    { key: 'email', header: 'Email', width: '200px' },
    { key: 'activo', header: 'Activo', width: '90px', align: 'center' },
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
    this.usuarioService.findPaginated(this.pageIndex(), this.pageSize()).subscribe({
      next: (response) => {
        this.usuarios.set(response.content);
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
    this.selectedUsuario.set(null);
    this.dialogOpen.set(true);
  }

  protected openEditDialog(usuario: UsuarioOutput): void {
    this.selectedUsuario.set(usuario);
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
    this.selectedUsuario.set(null);
  }

  protected onUsuarioSaved(): void {
    this.closeDialog();
    this.load();
  }

  protected onRowAction(actionId: string, usuario: UsuarioOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(usuario);
    }
  }

  protected funcionarioNombre(u: UsuarioOutput): string {
    const p = u.funcionario?.persona;
    return `${p?.nombre ?? ''} ${p?.apellido ?? ''}`.trim() || 'Sin funcionario';
  }

  protected rolesLabel(u: UsuarioOutput): string {
    return (u.roles ?? []).map((r) => r.descripcion).filter(Boolean).join(', ');
  }

  protected activoLabel(u: UsuarioOutput): string {
    return u.activo ? 'Sí' : 'No';
  }

  protected trackById = (u: UsuarioOutput): unknown => u.id;
}
