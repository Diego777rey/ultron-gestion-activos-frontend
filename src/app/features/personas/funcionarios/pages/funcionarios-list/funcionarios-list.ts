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
import { FuncionarioService } from '../../services/funcionario.service';
import { FuncionarioOutput } from '../../interfaces/funcionario.interface';
import { FuncionarioFormComponent } from '../../dialogs/funcionario-form/funcionario-form';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';

@Component({
  selector: 'app-funcionarios-list',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './funcionarios-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class FuncionariosListComponent {
  private readonly funcionarioService = inject(FuncionarioService);

  protected readonly funcionarios = signal<FuncionarioOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<FuncionarioOutput>[] = [
    { key: 'id', header: 'Id', width: '80px', align: 'center' },
    { key: 'nombre', header: 'Nombre', width: '220px' },
    { key: 'sector', header: 'Sector', width: '160px' },
    { key: 'sueldo', header: 'Sueldo', width: '120px', align: 'right' },
    { key: 'telefono', header: 'Teléfono', width: '140px' },
    { key: 'email', header: 'Gmail', width: '200px' },
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
    this.funcionarioService.findPaginated(this.pageIndex(), this.pageSize(), this.search()).subscribe({
      next: (response) => {
        this.funcionarios.set(response.content);
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
    this.dialogService.openForm(FuncionarioFormComponent, {
      title: 'Nuevo Funcionario',
      subtitle: 'Completa los datos para registrar un funcionario',
      maxWidth: '760px',
    }).subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  protected openEditDialog(funcionario: FuncionarioOutput): void {
    this.dialogService.openForm(FuncionarioFormComponent, {
      title: 'Editar Funcionario',
      subtitle: 'Modifica los datos del funcionario',
      maxWidth: '760px',
      inputs: { funcionario },
    }).subscribe((saved) => {
      if (saved) {
        this.load();
      }
    });
  }

  protected onRowAction(actionId: string, funcionario: FuncionarioOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(funcionario);
    }
  }

  protected fullName(f: FuncionarioOutput): string {
    return `${f.persona?.nombre ?? ''} ${f.persona?.apellido ?? ''}`.trim() || 'Sin nombre';
  }

  protected formatSueldo(f: FuncionarioOutput): string {
    if (f.sueldo == null) return '';
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      maximumFractionDigits: 0,
    }).format(f.sueldo);
  }

  protected trackById = (f: FuncionarioOutput): unknown => f.id_funcionario;
}
