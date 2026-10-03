import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { EmpresaOutput } from '../../../../personas/empresas/interfaces/empresa.interface';
import { EmpresaService } from '../../../../personas/empresas/services/empresa.service';
import { EmpresaFormComponent } from '../../../../personas/empresas/dialogs/empresa-form/empresa-form';

@Component({
  selector: 'app-datos-facturacion-page',
  imports: [GenericListComponent, TableCellDirective, ActionMenuComponent, DefaultEmptyPipe],
  templateUrl: './datos-facturacion-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class DatosFacturacionPageComponent {
  private readonly empresaService = inject(EmpresaService);
  private readonly dialogService = inject(AppDialogService);
  private readonly router = inject(Router);

  private readonly todas = signal<EmpresaOutput[]>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);

  protected readonly filtradas = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.todas();
    if (!q) {
      return list;
    }
    return list.filter((empresa) =>
      [empresa.razon_social, empresa.nombre_fantasia, empresa.ruc, empresa.telefono, empresa.direccion, empresa.email]
        .some((value) => (value ?? '').toLowerCase().includes(q)),
    );
  });

  protected readonly empresas = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtradas().slice(start, start + this.pageSize());
  });

  protected readonly totalElements = computed(() => this.filtradas().length);

  protected readonly columns: TableColumn<EmpresaOutput>[] = [
    { key: 'id', header: 'Id', width: '70px' },
    { key: 'razon_social', header: 'Razón social', width: '220px' },
    { key: 'nombre_fantasia', header: 'Nombre de fantasía', width: '180px' },
    { key: 'ruc', header: 'RUC', width: '140px' },
    { key: 'telefono', header: 'Teléfono', width: '140px' },
    { key: 'direccion', header: 'Dirección', width: '220px' },
    { key: 'activa', header: 'Activa', width: '90px' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Agregar' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'timbrado', label: 'Agregar timbrado', icon: 'confirmation_number' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.empresaService.getEmpresas().subscribe({
      next: (list) => {
        this.todas.set(list);
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
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.pageIndex.set(0);
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

  protected openNewDialog(): void {
    this.dialogService
      .openForm(EmpresaFormComponent, {
        title: 'Nueva empresa',
        subtitle: 'Datos del emisor para la factura en papel',
        maxWidth: '760px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected openEditDialog(empresa: EmpresaOutput): void {
    this.dialogService
      .openForm(EmpresaFormComponent, {
        title: 'Editar empresa',
        subtitle: 'Datos del emisor para la factura en papel',
        maxWidth: '760px',
        inputs: { empresa },
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected onRowAction(actionId: string, empresa: EmpresaOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(empresa);
      return;
    }
    if (actionId === 'timbrado') {
      void this.router.navigate(['/financiero/facturacion/timbrados'], {
        queryParams: { idEmpresa: empresa.id_empresa },
      });
    }
  }

  protected trackById = (empresa: EmpresaOutput): unknown => empresa.id_empresa;
}
