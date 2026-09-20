import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { CajaOutput } from '../../../cajas/interfaces/caja.interface';
import { CajaService } from '../../../cajas/services/caja.service';

@Component({
  selector: 'app-seleccionar-caja-dialog',
  imports: [UiButtonComponent, EntitySearcherComponent],
  templateUrl: './seleccionar-caja-dialog.component.html',
  styleUrl: './seleccionar-caja-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeleccionarCajaDialogComponent {
  private readonly cajaService = inject(CajaService);
  private readonly dialogRef = inject(DialogRef<CajaOutput | undefined>, { optional: true });

  protected readonly cajas = signal<CajaOutput[]>([]);
  protected readonly selectedCaja = signal<CajaOutput | null>(null);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly filter = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly cajaColumns: TableColumn<CajaOutput>[] = [
    { key: 'id_caja', header: 'Id', width: '80px' },
    { key: 'nombre', header: 'Nombre', value: (c) => c.nombre ?? '' },
    { key: 'sector', header: 'Sector', value: (c) => c.sector?.nombre ?? '' },
  ];

  protected readonly cajaLabelFn = (c: CajaOutput) => c.nombre ?? `Caja #${c.id_caja}`;
  protected readonly cajaKeyFn = (c: CajaOutput) => c.id_caja;
  protected readonly cajaSearchFn = (c: CajaOutput, query: string): boolean =>
    (c.nombre ?? '').toLowerCase().includes(query) || String(c.id_caja).includes(query);

  protected readonly cajasDisponibles = computed(() => {
    const list = this.cajas();
    const selected = this.selectedCaja();
    if (selected && !list.some((c) => c.id_caja === selected.id_caja)) {
      return [selected, ...list];
    }
    return list;
  });

  constructor() {
    this.fetchCajas(0, this.pageSize());
  }

  protected fetchCajas(page: number, size: number, filter = ''): void {
    this.loading.set(true);
    this.cajaService.findPaginated(page, size, filter).subscribe({
      next: (response) => {
        this.cajas.set(response.content);
        this.total.set(response.pageInfo.totalElements);
        this.pageIndex.set(page);
        this.pageSize.set(size);
        this.filter.set(filter);
        this.loading.set(false);
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
  }

  protected cancelar(): void {
    this.dialogRef?.close(undefined);
  }

  protected confirmar(): void {
    const caja = this.selectedCaja();
    if (!caja) {
      this.error.set('Debe seleccionar una caja');
      return;
    }
    this.dialogRef?.close(caja);
  }
}
