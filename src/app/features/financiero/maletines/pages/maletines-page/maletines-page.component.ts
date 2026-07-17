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
import { MaletinService } from '../../services/maletin.service';
import { MaletinOutput } from '../../interfaces/maletin.interface';
import { MaletinFormComponent } from '../../dialogs/maletin-form/maletin-form.component';

@Component({
  selector: 'app-maletines-page',
  imports: [
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
    DecimalPipe,
  ],
  templateUrl: './maletines-page.component.html',
  styleUrl: './maletines-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class MaletinesPageComponent {
  private readonly maletinService = inject(MaletinService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly maletines = signal<MaletinOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<MaletinOutput>[] = [
    { key: 'nombre', header: 'Nombre', width: '240px' },
    { key: 'estado', header: 'Estado', width: '120px' },
    { key: 'balancePyg', header: 'Balance Gs.', width: '140px' },
    { key: 'balanceUsd', header: 'Balance US$', width: '120px' },
    { key: 'balanceBrl', header: 'Balance R$', width: '120px' },
    { key: 'activo', header: 'Activo', width: '90px' },
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
    this.maletinService.findPaginated(this.pageIndex(), this.pageSize(), this.search()).subscribe({
      next: (response) => {
        this.maletines.set(response.content);
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
      .openForm(MaletinFormComponent, {
        title: 'Nuevo Maletín',
        subtitle: 'Registrá un maletín para verificar en la apertura de caja',
        maxWidth: '640px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected openEditDialog(maletin: MaletinOutput): void {
    this.dialogService
      .openForm(MaletinFormComponent, {
        title: 'Editar Maletín',
        subtitle: 'Modificá los datos del maletín',
        maxWidth: '640px',
        inputs: { maletin },
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected onRowAction(actionId: string, maletin: MaletinOutput): void {
    if (actionId === 'edit') {
      this.openEditDialog(maletin);
    }
  }

  protected trackById = (m: MaletinOutput): unknown => m.id_maletin;
}
