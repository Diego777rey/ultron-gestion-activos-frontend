import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { ServicioService } from '../../services/servicio.service';
import { ServicioOutput } from '../../interfaces/servicio.interface';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { ServicioFormComponent } from '../../dialogs/servicio-form/servicio-form.component';
import { ReporteService } from '../../../../../shared/services/reporte.service';

@Component({
  selector: 'app-servicios-list',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './servicios-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class ServiciosListComponent {
  private readonly servicioService = inject(ServicioService);
  private readonly dialogService = inject(AppDialogService);
  private readonly router = inject(Router);
  private readonly reporteService = inject(ReporteService);

  protected readonly servicios = signal<ServicioOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly generando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<ServicioOutput>[] = [
    { key: 'codigo', header: 'Código', width: '120px' },
    { key: 'nombre', header: 'Nombre', width: '300px' },
    { key: 'precio', header: 'Precio', width: '150px' },
    { key: 'categoria', header: 'Categoría', width: '200px' },
    { key: 'subcategoria', header: 'Subcategoría', width: '200px' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Adicionar' },
    { id: 'generar', label: 'Reporte' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'generar', label: 'Reporte', icon: 'picture_as_pdf' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.servicioService.findPaginated(this.pageIndex(), this.pageSize(), this.search()).subscribe({
      next: (response) => {
        this.servicios.set(response.content);
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
        this.router.navigate(['/inventario/servicios/nuevo']);
        break;
      case 'generar':
        this.generarReporte();
        break;
    }
  }

  protected generarReporte(): void {
    if (this.generando()) {
      return;
    }
    this.generando.set(true);
    this.reporteService.generarInventario('servicio', { filtro: this.search() }).subscribe({
      next: () => this.generando.set(false),
      error: () => this.generando.set(false),
    });
  }

  protected generarFicha(servicio: ServicioOutput): void {
    if (this.generando() || !servicio.id_servicio) {
      return;
    }
    this.generando.set(true);
    this.reporteService.generarInventario('servicio', { id: servicio.id_servicio }).subscribe({
      next: () => this.generando.set(false),
      error: () => this.generando.set(false),
    });
  }

  protected openEditDialog(servicio: ServicioOutput): void {
    this.dialogService.openForm(ServicioFormComponent, {
      title: 'Editar Servicio',
      subtitle: 'Actualizá los datos del servicio',
      maxWidth: '820px',
      inputs: { servicio },
    }).subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  protected onRowAction(actionId: string, servicio: ServicioOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(servicio);
    } else if (actionId === 'generar') {
      this.generarFicha(servicio);
    }
  }

  protected categoriaNombre(servicio: ServicioOutput): string {
    const cat = servicio.categoriaServicio;
    if (!cat) {
      return '';
    }
    return cat.categoriaPadre?.nombre ?? cat.nombre;
  }

  protected subcategoriaNombre(servicio: ServicioOutput): string {
    const cat = servicio.categoriaServicio;
    if (!cat?.categoriaPadre) {
      return '';
    }
    return cat.nombre;
  }

  protected trackById = (s: ServicioOutput): unknown => s.id_servicio;
}
