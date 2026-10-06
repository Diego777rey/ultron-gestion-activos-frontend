import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { nombreCompletoPersona } from '../../../../personas/shared/nombre-persona';
import { EquipoService } from '../../services/equipo.service';
import { EquipoOutput } from '../../interfaces/equipo.interface';
import { EquipoFormComponent } from '../../dialogs/equipo-form/equipo-form';

@Component({
  selector: 'app-equipos-list',
  imports: [GenericListComponent, TableCellDirective, ActionMenuComponent, DefaultEmptyPipe],
  templateUrl: './equipos-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class EquiposListComponent {
  private readonly equipoService = inject(EquipoService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly equipos = signal<EquipoOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<EquipoOutput>[] = [
    { key: 'id', header: 'Id', width: '80px', align: 'center' },
    { key: 'cliente', header: 'Cliente', width: '220px' },
    { key: 'tipo_equipo', header: 'Tipo', width: '140px' },
    { key: 'marca_modelo', header: 'Marca / Modelo', width: '180px' },
    { key: 'numero_serie', header: 'N° de serie', width: '150px' },
    { key: 'vehiculo', header: 'Vehículo', width: '200px' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Agregar' },
  ];

  protected readonly rowActions: MenuAction[] = [{ id: 'edit', label: 'Editar', icon: 'edit' }];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.equipoService.findPaginated(this.pageIndex(), this.pageSize(), this.search(), true).subscribe({
      next: (response) => {
        this.equipos.set(response.content);
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
        this.openDialog(null);
        break;
    }
  }

  protected onRowAction(actionId: string, equipo: EquipoOutput): void {
    if (actionId === 'edit') {
      this.openDialog(equipo);
    }
  }

  private openDialog(equipo: EquipoOutput | null): void {
    this.dialogService
      .openForm(EquipoFormComponent, {
        title: equipo ? 'Editar Equipo' : 'Nuevo Equipo',
        subtitle: equipo
          ? 'Modifica los datos del equipo'
          : 'Registra un equipo del cliente; el vehículo es opcional',
        maxWidth: '760px',
        inputs: equipo ? { equipo } : {},
      })
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  protected formatCliente(e: EquipoOutput): string {
    return nombreCompletoPersona(e.cliente?.persona) || 'Sin cliente';
  }

  protected formatMarcaModelo(e: EquipoOutput): string {
    return [e.marca, e.modelo].filter(Boolean).join(' ');
  }

  protected formatVehiculo(e: EquipoOutput): string {
    const v = e.vehiculo;
    if (!v) return 'Sin vehículo';
    const desc = [v.marca, v.modelo].filter(Boolean).join(' ');
    return v.chapa ? `${desc} (${v.chapa})` : desc;
  }

  protected trackById = (e: EquipoOutput): unknown => e.id_equipo;
}
