import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { TerminalService } from '../../services/terminal.service';
import { TerminalOutput } from '../../interfaces/terminal.interface';
import { AsignarCajaTerminalDialogComponent } from '../../dialogs/asignar-caja-terminal-dialog/asignar-caja-terminal-dialog.component';
import { TerminalNombreDialogComponent } from '../../dialogs/terminal-nombre-dialog/terminal-nombre-dialog.component';

@Component({
  selector: 'app-terminales-page',
  imports: [
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
    DatePipe,
  ],
  templateUrl: './terminales-page.component.html',
  styleUrl: './terminales-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class TerminalesPageComponent {
  private readonly terminalService = inject(TerminalService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly terminales = signal<TerminalOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<TerminalOutput>[] = [
    { key: 'nombre', header: 'Nombre', width: '160px' },
    { key: 'macAddress', header: 'MAC', width: '160px' },
    { key: 'hostname', header: 'Hostname', width: '160px' },
    { key: 'caja', header: 'Caja habilitada', width: '180px' },
    { key: 'ultimaConexion', header: 'Últ. conexión', width: '170px' },
    { key: 'plataforma', header: 'SO', width: '90px' },
    { key: 'activa', header: 'Activa', width: '80px' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'asignar', label: 'Habilitar caja', icon: 'link' },
    { id: 'desasignar', label: 'Quitar caja', icon: 'link_off' },
    { id: 'renombrar', label: 'Renombrar', icon: 'edit' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.terminalService.findPaginated(this.pageIndex(), this.pageSize(), this.search()).subscribe({
      next: (response) => {
        this.terminales.set(response.content);
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
    }
  }

  protected onRowAction(actionId: string, terminal: TerminalOutput): void {
    switch (actionId) {
      case 'asignar':
        this.abrirAsignar(terminal);
        break;
      case 'desasignar':
        this.desasignar(terminal);
        break;
      case 'renombrar':
        this.renombrar(terminal);
        break;
    }
  }

  protected cajaLabel(terminal: TerminalOutput): string {
    if (!terminal.idCaja) {
      return 'Sin caja';
    }
    return terminal.cajaNombre ?? `Caja #${terminal.idCaja}`;
  }

  protected trackById = (t: TerminalOutput): unknown => t.id_terminal;

  private abrirAsignar(terminal: TerminalOutput): void {
    this.dialogService
      .openForm(AsignarCajaTerminalDialogComponent, {
        title: 'Habilitar caja en terminal',
        subtitle: `${terminal.nombre || terminal.hostname || 'PC'} · MAC ${terminal.macAddress}`,
        maxWidth: '640px',
        inputs: { terminal },
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  private desasignar(terminal: TerminalOutput): void {
    if (!terminal.idCaja) {
      this.error.set('Esta terminal no tiene una caja asignada');
      return;
    }
    this.terminalService.desasignarCaja(terminal.id_terminal).subscribe({
      next: () => this.load(),
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo desasignar la caja');
      },
    });
  }

  private renombrar(terminal: TerminalOutput): void {
    this.dialogService
      .openForm(TerminalNombreDialogComponent, {
        title: 'Renombrar terminal',
        subtitle: `MAC ${terminal.macAddress}`,
        maxWidth: '480px',
        inputs: { terminal },
      })
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }
}
