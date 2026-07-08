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
import { VehiculoService } from '../../services/vehiculo.service';
import { VehiculoOutput } from '../../interfaces/vehiculo.interface';
import { VehiculoFormComponent } from '../../dialogs/vehiculo-form/vehiculo-form';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';

@Component({
  selector: 'app-vehiculos-list',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './vehiculos-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class VehiculosListComponent {
  private readonly vehiculoService = inject(VehiculoService);

  protected readonly vehiculos = signal<VehiculoOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<VehiculoOutput>[] = [
    { key: 'id', header: 'Id', width: '80px', align: 'center' },
    { key: 'cliente', header: 'Cliente', width: '220px' },
    { key: 'tipo_vehiculo', header: 'Tipo', width: '120px' },
    { key: 'marca', header: 'Marca', width: '120px' },
    { key: 'modelo', header: 'Modelo', width: '120px' },
    { key: 'chapa', header: 'Chapa', width: '120px', align: 'center' },
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
    this.vehiculoService.findPaginated(this.pageIndex(), this.pageSize(), this.search()).subscribe({
      next: (response) => {
        this.vehiculos.set(response.content);
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
    this.dialogService.openForm(VehiculoFormComponent, {
      title: 'Nuevo Vehículo',
      subtitle: 'Completa los datos para registrar un vehículo',
      maxWidth: '760px',
    }).subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  protected openEditDialog(vehiculo: VehiculoOutput): void {
    this.dialogService.openForm(VehiculoFormComponent, {
      title: 'Editar Vehículo',
      subtitle: 'Modifica los datos del vehículo',
      maxWidth: '760px',
      inputs: { vehiculo },
    }).subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  protected onRowAction(actionId: string, vehiculo: VehiculoOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(vehiculo);
    }
  }

  protected formatCliente(v: VehiculoOutput): string {
    const p = v.cliente?.persona;
    return p ? `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() : 'Sin cliente';
  }

  protected trackById = (v: VehiculoOutput): unknown => v.id_bien;
}
