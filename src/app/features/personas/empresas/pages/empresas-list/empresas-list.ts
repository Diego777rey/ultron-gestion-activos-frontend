import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
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
import { EmpresaService } from '../../services/empresa.service';
import { EmpresaOutput } from '../../interfaces/empresa.interface';
import { EmpresaFormComponent } from '../../dialogs/empresa-form/empresa-form';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { FileUploadService } from '../../../../../shared/services/file-upload.service';

@Component({
  selector: 'app-empresas-list',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './empresas-list.html',
  styleUrl: './empresas-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class EmpresasListComponent {
  private readonly empresaService = inject(EmpresaService);
  private readonly dialogService = inject(AppDialogService);
  protected readonly fileUploadService = inject(FileUploadService);

  protected readonly empresas = signal<EmpresaOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly columns: TableColumn<EmpresaOutput>[] = [
    { key: 'logo', header: 'Logo', width: '80px', align: 'center' },
    { key: 'razon_social', header: 'Razón Social', width: '250px' },
    { key: 'ruc', header: 'RUC', width: '150px' },
    { key: 'telefono', header: 'Teléfono', width: '140px' },
    { key: 'email', header: 'Email', width: '200px' },
    { key: 'direccion', header: 'Dirección', width: '220px' },
    { key: 'estado', header: 'Estado', width: '100px', align: 'center' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'add', label: '+ Agregar' },
    { id: 'reload', label: 'Recargar' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    { id: 'delete', label: 'Eliminar', icon: 'delete' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        this.empresas.set(empresas);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo conectar con el servidor');
        this.loading.set(false);
      },
    });
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'add':
        this.openNewDialog();
        break;
      case 'reload':
        this.load();
        break;
    }
  }

  protected onRowAction(actionId: string, empresa: EmpresaOutput): void {
    switch (actionId) {
      case 'edit':
        this.openEditDialog(empresa);
        break;
      case 'delete':
        this.confirmDelete(empresa);
        break;
    }
  }

  private openNewDialog(): void {
    const dialogRef = this.dialogService.open(EmpresaFormComponent, {
      data: null,
    });

    dialogRef.closed.subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  private openEditDialog(empresa: EmpresaOutput): void {
    const dialogRef = this.dialogService.open(EmpresaFormComponent, {
      data: empresa,
    });

    dialogRef.closed.subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  private confirmDelete(empresa: EmpresaOutput): void {
    if (!confirm(`¿Está seguro de eliminar la empresa "${empresa.razon_social}"?`)) {
      return;
    }

    this.loading.set(true);
    this.empresaService.eliminarEmpresa(empresa.id_empresa).subscribe({
      next: () => {
        this.load();
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo eliminar la empresa');
        this.loading.set(false);
      },
    });
  }
}
