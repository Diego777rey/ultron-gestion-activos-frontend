import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { CotizacionService } from '../../services/cotizacion.service';
import { CotizacionOutput } from '../../interfaces/cotizacion.interface';
import { CotizacionFormComponent } from '../../dialogs/cotizacion-form/cotizacion-form.component';

@Component({
  selector: 'app-cotizaciones-page',
  imports: [
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
    DecimalPipe,
    DatePipe,
  ],
  templateUrl: './cotizaciones-page.component.html',
  styleUrl: './cotizaciones-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class CotizacionesPageComponent {
  private readonly cotizacionService = inject(CotizacionService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly cotizaciones = signal<CotizacionOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<CotizacionOutput>[] = [
    { key: 'moneda', header: 'Moneda', width: '220px' },
    { key: 'valor', header: 'Valor', width: '200px', align: 'right' },
    { key: 'fechaActualizacion', header: 'Última actualización', width: '200px', align: 'center' },
    { key: 'activa', header: 'Activa', width: '100px', align: 'center' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Agregar' },
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
    this.cotizacionService.findPaginated(this.pageIndex(), this.pageSize(), this.search(), true).subscribe({
      next: (response) => {
        this.cotizaciones.set(response.content);
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
      .openForm(CotizacionFormComponent, {
        title: 'Nueva Cotización',
        subtitle: 'Registrá el valor de cotización de una moneda',
        maxWidth: '560px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected openEditDialog(cotizacion: CotizacionOutput): void {
    this.dialogService
      .openForm(CotizacionFormComponent, {
        title: 'Editar Cotización',
        subtitle: 'Modificá el valor de cotización de la moneda',
        maxWidth: '560px',
        inputs: { cotizacion },
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected onRowAction(actionId: string, cotizacion: CotizacionOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(cotizacion);
    }
  }

  protected monedaLabel(moneda: string): string {
    switch (moneda) {
      case 'REAL':
        return 'Real Brasileño';
      case 'GUARANI':
        return 'Guaraní';
      case 'DOLAR':
        return 'Dólar';
      default:
        return moneda;
    }
  }

  protected trackById = (c: CotizacionOutput): unknown => c.id_cotizacion;
}
