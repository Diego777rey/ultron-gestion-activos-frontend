import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../../shared/components/entity-searcher/entity-searcher';
import { TableColumn } from '../../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../../shared/models/pagination.model';
import { SectorOutput } from '../../../../../sectores/interfaces/sector.interface';
import { SectorService } from '../../../../../sectores/services/sector.service';
import { TransferenciaService } from '../../services/transferencia.service';
import { TransferenciaOutput } from '../../interfaces/transferencia.interface';

@Component({
  selector: 'app-transferencia-form',
  imports: [ReactiveFormsModule, UiButtonComponent, EntitySearcherComponent],
  templateUrl: './transferencia-form.component.html',
  styleUrl: './transferencia-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferenciaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sectorService = inject(SectorService);
  private readonly transferenciaService = inject(TransferenciaService);
  private readonly dialogRef = inject(DialogRef<TransferenciaOutput | undefined>, { optional: true });

  readonly saved = output<TransferenciaOutput>();

  protected saving = false;
  protected error: string | null = null;

  protected readonly selectedOrigen = signal<SectorOutput | null>(null);
  protected readonly selectedDestino = signal<SectorOutput | null>(null);

  protected readonly sectores = signal<SectorOutput[]>([]);
  protected readonly sectoresTotal = signal(0);
  protected readonly sectoresPage = signal(0);
  protected readonly sectoresPageSize = signal(15);
  protected readonly sectoresFilter = signal('');
  protected readonly loadingSectores = signal(false);

  protected readonly sectorColumns: TableColumn<SectorOutput>[] = [
    { key: 'id_sector', header: 'Id', width: '80px' },
    { key: 'nombre', header: 'Nombre', value: (s) => s.nombre ?? '' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    idSectorOrigen: [null as number | null, Validators.required],
    idSectorDestino: [null as number | null, Validators.required],
  });

  constructor() {
    this.fetchSectoresPage(0, this.sectoresPageSize());
  }

  protected readonly sectorLabelFn = (s: SectorOutput) => s.nombre ?? `Sector #${s.id_sector}`;
  protected readonly sectorKeyFn = (s: SectorOutput) => s.id_sector;

  protected fetchSectoresPage(page: number, size: number, filter = ''): void {
    this.loadingSectores.set(true);
    this.sectorService.findPaginated(page, size, filter).subscribe({
      next: (response) => {
        this.sectores.set(response.content);
        this.sectoresTotal.set(response.pageInfo.totalElements);
        this.sectoresPage.set(page);
        this.sectoresPageSize.set(size);
        this.sectoresFilter.set(filter);
        this.loadingSectores.set(false);
      },
      error: () => {
        this.error = 'No se pudieron cargar los sectores';
        this.loadingSectores.set(false);
      },
    });
  }

  protected onSectorSearchChange(filter: string): void {
    this.fetchSectoresPage(0, this.sectoresPageSize(), filter);
  }

  protected onSectorPageChange(event: PageChange): void {
    this.fetchSectoresPage(event.pageIndex, event.pageSize, this.sectoresFilter());
  }

  protected onOrigenSelected(sector: SectorOutput | null): void {
    this.selectedOrigen.set(sector);
    this.form.controls.idSectorOrigen.setValue(sector?.id_sector ?? null);
    this.form.controls.idSectorOrigen.markAsTouched();
  }

  protected onDestinoSelected(sector: SectorOutput | null): void {
    this.selectedDestino.set(sector);
    this.form.controls.idSectorDestino.setValue(sector?.id_sector ?? null);
    this.form.controls.idSectorDestino.markAsTouched();
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Completá sector origen y destino';
      return;
    }
    const origen = this.form.controls.idSectorOrigen.value;
    const destino = this.form.controls.idSectorDestino.value;
    if (origen === destino) {
      this.error = 'El sector origen y destino deben ser distintos';
      return;
    }

    this.saving = true;
    this.error = null;
    this.transferenciaService
      .create({
        idSectorOrigen: Number(origen),
        idSectorDestino: Number(destino),
      })
      .subscribe({
        next: (transferencia) => {
          this.saving = false;
          this.saved.emit(transferencia);
          this.dialogRef?.close(transferencia);
        },
        error: (err: Error) => {
          this.saving = false;
          this.error = err.message || 'No se pudo registrar la transferencia';
        },
      });
  }
}
