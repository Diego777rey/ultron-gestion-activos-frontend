import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { SectorOutput } from '../../../../sectores/interfaces/sector.interface';
import { SectorService } from '../../../../sectores/services/sector.service';
import { SectorFormComponent } from '../../../../sectores/dialogs/sector-form/sector-form.component';
import { CajaInput, CajaOutput } from '../../interfaces/caja.interface';
import { CajaService } from '../../services/caja.service';

@Component({
  selector: 'app-caja-form',
  imports: [
    ReactiveFormsModule,
    UiButtonComponent,
    AutofocusDirective,
    UppercaseDirective,
    EntitySearcherComponent,
  ],
  templateUrl: './caja-form.component.html',
  styleUrl: './caja-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cajaService = inject(CajaService);
  private readonly sectorService = inject(SectorService);
  private readonly dialogService = inject(AppDialogService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly caja = input<CajaOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly sectores = signal<SectorOutput[]>([]);
  protected readonly selectedSector = signal<SectorOutput | null>(null);
  protected readonly sectoresTotal = signal(0);
  protected readonly sectoresPage = signal(0);
  protected readonly sectoresPageSize = signal(15);
  protected readonly sectoresFilter = signal('');
  protected readonly loadingSectores = signal(false);

  protected readonly sectorColumns: TableColumn<SectorOutput>[] = [
    { key: 'id_sector', header: 'Id', width: '80px' },
    { key: 'nombre', header: 'Nombre', value: (s) => s.nombre ?? '' },
    { key: 'descripcion', header: 'Descripción', value: (s) => s.descripcion ?? '' },
  ];

  protected readonly sectoresDisponibles = computed(() => {
    const list = this.sectores();
    const selected = this.selectedSector();
    if (selected && !list.find((s) => s.id_sector === selected.id_sector)) {
      return [selected, ...list];
    }
    return list;
  });

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    saldoActual: [0, [Validators.min(0)]],
    activa: [true],
    idSector: [null as number | null, [Validators.required]],
  });

  constructor() {
    this.fetchSectoresPage(0, this.sectoresPageSize());

    effect(() => {
      const c = this.caja();
      if (c) {
        this.isEdit = !!c.id_caja;
        if (c.sector) {
          this.selectedSector.set(c.sector);
        }
        this.form.reset({
          nombre: c.nombre,
          saldoActual: c.saldoActual ?? 0,
          activa: c.activa ?? true,
          idSector: c.sector?.id_sector ?? null,
        });
      } else {
        this.isEdit = false;
        this.selectedSector.set(null);
        this.form.reset({
          nombre: '',
          saldoActual: 0,
          activa: true,
          idSector: null,
        });
      }
    });
  }

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

  protected onSectorSelected(sector: SectorOutput | null): void {
    this.selectedSector.set(sector);
    this.form.controls.idSector.setValue(sector?.id_sector ?? null);
    this.form.controls.idSector.markAsTouched();
  }

  protected onAddSector(): void {
    this.dialogService
      .openForm(SectorFormComponent, {
        title: 'Nuevo Sector',
        subtitle: 'Registrá una ubicación física (depósito, salón de ventas, etc.)',
        maxWidth: '640px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.fetchSectoresPage(0, this.sectoresPageSize(), '');
        }
      });
  }

  protected readonly sectorLabelFn = (s: SectorOutput) => s.nombre ?? `Sector #${s.id_sector}`;
  protected readonly sectorKeyFn = (s: SectorOutput) => s.id_sector;

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload: CajaInput = {
      nombre: v.nombre.trim(),
      saldoActual: v.saldoActual,
      activa: v.activa,
      idSector: Number(v.idSector),
    };

    this.saving = true;
    this.error = null;
    const current = this.caja();
    const request =
      current?.id_caja != null
        ? this.cajaService.update(current.id_caja, payload)
        : this.cajaService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar la caja';
      },
    });
  }
}
