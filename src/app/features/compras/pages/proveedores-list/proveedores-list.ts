import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { GenericListComponent } from '../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../shared/models/pagination.model';
import { ProveedorOutput } from '../../../../shared/models/compras.model';
import { ProveedorService } from '../../../../shared/services/proveedor.service';
import { AppDialogService } from '../../../../shared/services/app-dialog.service';
import { ProveedorFormComponent } from '../../dialogs/proveedor-form/proveedor-form';
import { coincideTexto, etiquetaActivo, etiquetaTipoPersona, nombreProveedor } from '../../shared/proveedor-presentacion';

@Component({
  selector: 'app-proveedores-list',
  imports: [GenericListComponent, TableCellDirective, ActionMenuComponent, DefaultEmptyPipe],
  templateUrl: './proveedores-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class ProveedoresListComponent {
  private readonly proveedorService = inject(ProveedorService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly proveedores = signal<ProveedorOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);

  protected readonly filtrados = computed(() => {
    const consulta = this.search().trim().toLowerCase();
    const items = this.proveedores();
    if (!consulta) {
      return items;
    }
    return items.filter((proveedor) =>
      coincideTexto(
        [
          nombreProveedor(proveedor),
          etiquetaTipoPersona(proveedor.tipo_persona),
          proveedor.ruc,
          proveedor.telefono,
          proveedor.email,
          proveedor.ciudad,
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

  protected readonly columns: TableColumn<ProveedorOutput>[] = [
    { key: 'id', header: 'Id', width: '80px', align: 'center' },
    { key: 'tipo', header: 'Tipo', width: '120px' },
    { key: 'nombre', header: 'Nombre / Razón social' },
    { key: 'ruc', header: 'RUC', width: '140px' },
    { key: 'telefono', header: 'Teléfono', width: '140px' },
    { key: 'email', header: 'Email', width: '200px' },
    { key: 'ciudad', header: 'Ciudad', width: '140px' },
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

  protected readonly nombre = nombreProveedor;
  protected readonly tipo = etiquetaTipoPersona;
  protected readonly estado = etiquetaActivo;
  protected readonly trackById = (proveedor: ProveedorOutput): unknown => proveedor.id_proveedor;

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
    this.proveedorService.findAll(true).subscribe({
      next: (proveedores) => {
        this.proveedores.set(proveedores);
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

  protected onRowAction(actionId: string, proveedor: ProveedorOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(proveedor);
      return;
    }
    if (actionId === 'delete') {
      this.confirmDelete(proveedor);
    }
  }

  private openNewDialog(): void {
    this.dialogService
      .openForm(ProveedorFormComponent, {
        title: 'Nuevo Proveedor',
        subtitle: 'Completa los datos para registrar un proveedor',
        maxWidth: '760px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  private openEditDialog(proveedor: ProveedorOutput): void {
    this.dialogService
      .openForm(ProveedorFormComponent, {
        title: 'Editar Proveedor',
        subtitle: 'Modifica los datos del proveedor',
        maxWidth: '760px',
        inputs: { proveedor },
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  private confirmDelete(proveedor: ProveedorOutput): void {
    this.dialogService
      .confirm(`¿Eliminar el proveedor "${nombreProveedor(proveedor)}"?`)
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.proveedorService.remove(proveedor.id_proveedor).subscribe({
          next: (ok) => {
            if (ok) {
              this.load();
            }
          },
        });
      });
  }
}
