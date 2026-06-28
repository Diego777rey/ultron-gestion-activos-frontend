import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { SearchBarComponent } from '../../../../../shared/components/search-bar/search-bar';
import { DataTableComponent } from '../../../../../shared/components/data-table/data-table';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { PaginatorComponent } from '../../../../../shared/components/paginator/paginator';
import {
  ActionMenuComponent,
  MenuAction,
} from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { ClienteService } from '../../services/cliente.service';
import { ClienteFormComponent } from '../../dialogs/cliente-form/cliente-form';
import { ClienteInput, ClienteOutput } from '../../interfaces/cliente.interface';

/**
 * Pantalla de Gestión de Clientes.
 * Compone exclusivamente componentes genéricos (encabezado, búsqueda, tabla,
 * paginador, menú de acciones y diálogo) para listar y administrar clientes.
 */
@Component({
  selector: 'app-clientes-page',
  imports: [
    PageHeaderComponent,
    UiButtonComponent,
    SearchBarComponent,
    DataTableComponent,
    TableCellDirective,
    PaginatorComponent,
    ActionMenuComponent,
    ClienteFormComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './clientes-page.html',
  styleUrl: './clientes-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'clientes-page-host' },
})
export class ClientesPageComponent {
  private readonly clienteService = inject(ClienteService);

  protected readonly clientes = signal<ClienteOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);

  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly selected = signal<ClienteOutput | null>(null);

  protected readonly columns: TableColumn<ClienteOutput>[] = [
    { key: 'documento', header: 'Documento', width: '16%' },
    { key: 'nombre', header: 'Nombre Completo', width: '24%' },
    { key: 'telefono', header: 'Teléfono', width: '14%' },
    { key: 'direccion', header: 'Dirección', width: '22%' },
    { key: 'registro', header: 'Registro', width: '14%' },
    { key: 'acciones', header: 'Acciones', width: '10%', align: 'center' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'delete', label: 'Eliminar', icon: 'delete', danger: true },
  ];

  /** Lista filtrada por el término de búsqueda. */
  protected readonly filtered = computed(() => {
    const term = this.normalize(this.search());
    const list = this.clientes();
    if (!term) {
      return list;
    }
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
        .map((v) => this.normalize(v ?? ''))
        .join(' ');
      return haystack.includes(term);
    });
  });

  protected readonly total = computed(() => this.filtered().length);

  /** Página actual de datos ya filtrados. */
  protected readonly paged = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  protected readonly subtitle = computed(
    () => `Base de datos de clientes registrados — ${this.clientes().length} registros`
  );

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

  protected onSearch(term: string): void {
    this.search.set(term);
    this.pageIndex.set(0);
  }

  protected onPageChange(event: PageChange): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected openNew(): void {
    this.selected.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(cliente: ClienteOutput): void {
    this.selected.set(cliente);
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
    this.selected.set(null);
  }

  protected onRowAction(actionId: string, cliente: ClienteOutput): void {
    if (actionId === 'edit') {
      this.openEdit(cliente);
    } else if (actionId === 'delete') {
      this.remove(cliente);
    }
  }

  protected onSave(input: ClienteInput): void {
    this.saving.set(true);
    const current = this.selected();
    const request = current?.id_cliente
      ? this.clienteService.update(current.id_cliente, input)
      : this.clienteService.create(input);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.load();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo guardar el cliente');
      },
    });
  }

  protected remove(cliente: ClienteOutput): void {
    if (!cliente.id_cliente) {
      return;
    }
    const nombre = `${cliente.persona?.nombre ?? ''} ${cliente.persona?.apellido ?? ''}`.trim();
    const confirmed = globalThis.confirm(`¿Eliminar al cliente "${nombre}"?`);
    if (!confirmed) {
      return;
    }
    this.clienteService.remove(cliente.id_cliente).subscribe({
      next: () => this.load(),
      error: (err: Error) => this.error.set(err.message || 'No se pudo eliminar el cliente'),
    });
  }

  protected generatePdf(): void {
    globalThis.print();
  }

  // ---- Helpers de presentación ----

  protected fullName(c: ClienteOutput): string {
    return `${c.persona?.nombre ?? ''} ${c.persona?.apellido ?? ''}`.trim() || 'Sin nombre';
  }

  protected initials(c: ClienteOutput): string {
    const n = c.persona?.nombre?.charAt(0) ?? '';
    const a = c.persona?.apellido?.charAt(0) ?? '';
    return `${n}${a}`.toUpperCase() || '?';
  }

  protected docLabel(c: ClienteOutput): string {
    return c.ruc ? 'RUC' : 'CI';
  }

  protected docValue(c: ClienteOutput): string {
    return c.ruc || c.persona?.documento || '—';
  }

  protected avatarColor(c: ClienteOutput): string {
    const text = this.fullName(c);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 55%, 45%)`;
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }

  protected trackById = (c: ClienteOutput): unknown => c.id_cliente;

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
