import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { GenericListComponent } from '../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../shared/models/pagination.model';
import { VendedorOutput } from '../../../../shared/models/compras.model';
import { VendedorService } from '../../../../shared/services/vendedor.service';
import { AppDialogService } from '../../../../shared/services/app-dialog.service';
import { VendedorFormComponent } from '../../dialogs/vendedor-form/vendedor-form';
import { coincideTexto, contactoVendedor, etiquetaActivo, nombreVendedor } from '../../shared/proveedor-presentacion';

@Component({
  selector: 'app-vendedores-list',
  imports: [GenericListComponent, TableCellDirective, ActionMenuComponent, DefaultEmptyPipe],
  templateUrl: './vendedores-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class VendedoresListComponent {
  private readonly vendedorService = inject(VendedorService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly vendedores = signal<VendedorOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);

  protected readonly filtrados = computed(() => {
    const consulta = this.search().trim().toLowerCase();
    const items = this.vendedores();
    if (!consulta) {
      return items;
    }
    return items.filter((vendedor) =>
      coincideTexto(
        [
          nombreVendedor(vendedor),
          vendedor.proveedor_nombre,
          vendedor.cargo,
          vendedor.telefono,
          vendedor.celular,
          vendedor.email,
        ],
        consulta,
      ),
    );
  });

  protected readonly visibles = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtrados().slice(start, start + this.pageSize());
  });

  protected readonly total = computed(() => this.filtrados().length);

  protected readonly columns: TableColumn<VendedorOutput>[] = [
    { key: 'id', header: 'Id', width: '80px', align: 'center' },
    { key: 'nombre', header: 'Nombre completo' },
    { key: 'proveedor', header: 'Proveedor', width: '220px' },
    { key: 'cargo', header: 'Cargo', width: '160px' },
    { key: 'telefono', header: 'Teléfono', width: '140px' },
    { key: 'email', header: 'Email', width: '200px' },
    { key: 'estado', header: 'Estado', width: '110px', align: 'center' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Agregar' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'delete', label: 'Eliminar', icon: 'delete' },
  ];

  protected readonly nombre = nombreVendedor;
  protected readonly contacto = contactoVendedor;
  protected readonly estado = etiquetaActivo;
  protected readonly trackById = (vendedor: VendedorOutput): unknown => vendedor.id_vendedor;

  constructor() {
    effect(() => {
      const total = this.filtrados().length;
      const maxPage = Math.max(0, Math.ceil(total / this.pageSize()) - 1);
      if (this.pageIndex() > maxPage) {
        this.pageIndex.set(maxPage);
      }
    });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.vendedorService.findAll(true).subscribe({
      next: (vendedores) => {
        this.vendedores.set(vendedores);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo conectar con el servidor');
        this.loading.set(false);
      },
    });
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.pageIndex.set(0);
  }

  protected onPageChange(event: PageChange): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'search':
        this.pageIndex.set(0);
        break;
      case 'clear':
        this.search.set('');
        this.pageIndex.set(0);
        break;
      case 'add':
        this.openNewDialog();
        break;
    }
  }

  protected onRowAction(actionId: string, vendedor: VendedorOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(vendedor);
      return;
    }
    if (actionId === 'delete') {
      this.confirmDelete(vendedor);
    }
  }

  private openNewDialog(): void {
    this.dialogService
      .openForm(VendedorFormComponent, {
        title: 'Nuevo Vendedor',
        subtitle: 'Completa los datos para registrar un vendedor',
        maxWidth: '760px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  private openEditDialog(vendedor: VendedorOutput): void {
    this.dialogService
      .openForm(VendedorFormComponent, {
        title: 'Editar Vendedor',
        subtitle: 'Modifica los datos del vendedor',
        maxWidth: '760px',
        inputs: { vendedor },
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  private confirmDelete(vendedor: VendedorOutput): void {
    this.dialogService
      .confirm(`¿Eliminar el vendedor "${nombreVendedor(vendedor)}"?`)
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.vendedorService.remove(vendedor.id_vendedor).subscribe({
          next: (ok) => {
            if (ok) {
              this.load();
            }
          },
        });
      });
  }
}
