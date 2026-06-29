import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { DataTableComponent } from '../../../../../shared/components/data-table/data-table';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { PaginatorComponent } from '../../../../../shared/components/paginator/paginator';
import {
  ActionMenuComponent,
  MenuAction,
} from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { ClienteService } from '../../services/cliente.service';
import { ClienteOutput } from '../../interfaces/cliente.interface';
import { ClienteFormComponent } from '../../dialogs/cliente-form/cliente-form';

@Component({
  selector: 'app-clientes-list',
  imports: [
    CommonModule,
    UiButtonComponent,
    DataTableComponent,
    TableCellDirective,
    PaginatorComponent,
    ActionMenuComponent,
    DefaultEmptyPipe,
    ModalComponent,
    ClienteFormComponent,
  ],
  templateUrl: './clientes-list.html',
  styleUrl: './clientes-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'clientes-list-host' },
})
export class ClientesListComponent {
  private readonly clienteService = inject(ClienteService);

  protected readonly clientes = signal<ClienteOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
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

  protected readonly rowActions: MenuAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'ver', label: 'Ver movimientos', icon: 'visibility' },
  ];

  protected readonly filtered = computed(() => {
    const term = this.normalize(this.search());
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
      ].map((v) => this.normalize(v ?? '')).join(' ');
      return haystack.includes(term);
    });
  });

  protected readonly total = computed(() => this.filtered().length);

  protected readonly paged = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

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

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.search.set(input.value);
  }

  protected onSearch(term: string): void {
    this.search.set(term);
    this.pageIndex.set(0);
  }

  protected onPageChange(event: PageChange): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
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

  private normalize(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }
}
