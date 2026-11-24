import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { CajaService } from '../../../cajas/services/caja.service';
import { CajaOutput } from '../../../cajas/interfaces/caja.interface';
import { TerminalService } from '../../services/terminal.service';
import { TerminalOutput } from '../../interfaces/terminal.interface';
import { NotifyErrorComponent } from '../../../../../shared/components/notify-error/notify-error';

@Component({
  selector: 'app-asignar-caja-terminal-dialog',
  imports: [NotifyErrorComponent, UiButtonComponent, EntitySearcherComponent],
  templateUrl: './asignar-caja-terminal-dialog.component.html',
  styleUrl: './asignar-caja-terminal-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsignarCajaTerminalDialogComponent {
  private readonly cajaService = inject(CajaService);
  private readonly terminalService = inject(TerminalService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly terminal = input.required<TerminalOutput>();
  readonly saved = output<void>();

  protected readonly cajas = signal<CajaOutput[]>([]);
  protected readonly selectedCaja = signal<CajaOutput | null>(null);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly filter = signal('');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly cajaColumns: TableColumn<CajaOutput>[] = [
    { key: 'id_caja', header: 'Id', width: '80px' },
    { key: 'nombre', header: 'Nombre', value: (c) => c.nombre ?? '' },
    { key: 'sector', header: 'Sector', value: (c) => c.sector?.nombre ?? '' },
    {
      key: 'mac',
      header: 'MAC actual',
      value: (c) => c.macAddress ?? 'Sin vínculo',
    },
  ];

  protected readonly cajaLabelFn = (c: CajaOutput) => c.nombre ?? `Caja #${c.id_caja}`;
  protected readonly cajaKeyFn = (c: CajaOutput) => c.id_caja;

  constructor() {
    queueMicrotask(() => this.fetchCajas(0, this.pageSize()));
  }

  protected fetchCajas(page: number, size: number, filter = ''): void {
    this.loading.set(true);
    this.cajaService.findPaginated(page, size, filter).subscribe({
      next: (response) => {
        this.cajas.set(response.content.filter((c) => c.activa !== false));
        this.total.set(response.pageInfo.totalElements);
        this.pageIndex.set(page);
        this.pageSize.set(size);
        this.filter.set(filter);
        this.loading.set(false);

        const actualId = this.terminal().idCaja;
        if (actualId != null) {
          const found = response.content.find((c) => c.id_caja === actualId) ?? null;
          if (found) {
            this.selectedCaja.set(found);
          }
        }
      },
      error: () => {
        this.error.set('No se pudieron cargar las cajas');
        this.loading.set(false);
      },
    });
  }

  protected onSearchChange(filter: string): void {
    this.fetchCajas(0, this.pageSize(), filter);
  }

  protected onPageChange(event: PageChange): void {
    this.fetchCajas(event.pageIndex, event.pageSize, this.filter());
  }

  protected onCajaSelected(caja: CajaOutput | null): void {
    this.selectedCaja.set(caja);
    this.error.set(null);
  }

  protected confirmar(): void {
    const caja = this.selectedCaja();
    if (!caja?.id_caja) {
      this.error.set('Seleccioná la caja que querés habilitar en esta PC');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.terminalService.asignarCaja(this.terminal().id_terminal, caja.id_caja).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo asignar la caja');
      },
    });
  }
}
