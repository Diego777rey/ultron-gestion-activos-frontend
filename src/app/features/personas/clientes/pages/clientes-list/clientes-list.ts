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
import { createListPagination } from '../../../../../shared/utils/list-pagination.util';
import { normalizeSearchTerm } from '../../../../../shared/utils/search.util';
import { ClienteService } from '../../services/cliente.service';
import { ClienteOutput } from '../../interfaces/cliente.interface';
import { ClienteFormComponent } from '../../dialogs/cliente-form/cliente-form';

@Component({
  selector: 'app-clientes-list',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
    ModalComponent,
    ClienteFormComponent,
  ],
  templateUrl: './clientes-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class ClientesListComponent {
  private readonly clienteService = inject(ClienteService);

  protected readonly clientes = signal<ClienteOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly selectedCliente = signal<ClienteOutput | null>(null);

  protected readonly dialogTitle = computed(() =>
    this.selectedCliente() ? 'Editar Cliente' : 'Nuevo Cliente'
  );

  protected readonly dialogSubtitle = computed(() =>
    this.selectedCliente()
      ? 'Modifica los datos del cliente'
      : 'Completa los datos para registrar un cliente'
  );

  protected readonly columns: TableColumn<ClienteOutput>[] = [
    { key: 'id', header: 'Id', width: '80px', align: 'center' },
    { key: 'nombre', header: 'Nombre', width: '220px' },
    { key: 'direccion', header: 'Dirección', width: '220px' },
    { key: 'telefono', header: 'Teléfono', width: '140px' },
    { key: 'email', header: 'Gmail', width: '200px' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Adicionar' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'ver', label: 'Ver movimientos', icon: 'visibility' },
  ];

  protected readonly filtered = computed(() => {
    const term = normalizeSearchTerm(this.search());
    const list = this.clientes();
    if (!term) return list;

    return list.filter((c) => {
      const haystack = [
        c.persona?.nombre,
        c.persona?.apellido,
        c.persona?.documento,
        c.persona?.email,
        c.persona?.telefono,
        c.persona?.direccion,
        c.ruc,
        c.tipoCliente,
      ]
        .map((v) => normalizeSearchTerm(v ?? ''))
        .join(' ');
      return haystack.includes(term);
    });
  });

  protected readonly pagination = createListPagination(this.filtered);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.clienteService.findAll().subscribe({
      next: (data) => {
        this.clientes.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo conectar con el servidor');
        this.loading.set(false);
      },
    });
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'search':
        this.pagination.resetPage();
        break;
      case 'clear':
        this.search.set('');
        this.pagination.resetPage();
        break;
      case 'add':
        this.openNewDialog();
        break;
    }
  }

  protected openNewDialog(): void {
    this.selectedCliente.set(null);
    this.dialogOpen.set(true);
  }

  protected openEditDialog(cliente: ClienteOutput): void {
    this.selectedCliente.set(cliente);
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
    this.selectedCliente.set(null);
  }

  protected onClienteSaved(): void {
    this.closeDialog();
    this.load();
  }

  protected onRowAction(actionId: string, cliente: ClienteOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(cliente);
    }
  }

  protected fullName(c: ClienteOutput): string {
    return `${c.persona?.nombre ?? ''} ${c.persona?.apellido ?? ''}`.trim() || 'Sin nombre';
  }

  protected trackById = (c: ClienteOutput): unknown => c.id_cliente;
}
