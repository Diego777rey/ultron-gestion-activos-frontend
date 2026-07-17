import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { CajaService } from '../../services/caja.service';
import { CajaOutput } from '../../interfaces/caja.interface';
import { CajaFormComponent } from '../../dialogs/caja-form/caja-form.component';

@Component({
  selector: 'app-cajas-page',
  imports: [
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
    DecimalPipe,
  ],
  templateUrl: './cajas-page.component.html',
  styleUrl: './cajas-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class CajasPageComponent {
  private readonly cajaService = inject(CajaService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly cajas = signal<CajaOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<CajaOutput>[] = [
    { key: 'nombre', header: 'Nombre', width: '260px' },
    { key: 'saldoActual', header: 'Saldo actual', width: '160px' },
    { key: 'activa', header: 'Activa', width: '100px' },
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
    this.cajaService.findPaginated(this.pageIndex(), this.pageSize(), this.search()).subscribe({
      next: (response) => {
        this.cajas.set(response.content);
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
      .openForm(CajaFormComponent, {
        title: 'Nueva Caja',
        subtitle: 'Registrá una caja para operar en el punto de venta',
        maxWidth: '560px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected openEditDialog(caja: CajaOutput): void {
    this.dialogService
      .openForm(CajaFormComponent, {
        title: 'Editar Caja',
        subtitle: 'Modificá los datos de la caja',
        maxWidth: '560px',
        inputs: { caja },
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected onRowAction(actionId: string, caja: CajaOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(caja);
    }
  }

  protected trackById = (c: CajaOutput): unknown => c.id_caja;
}
