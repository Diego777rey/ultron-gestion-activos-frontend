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
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../shared/components/entity-searcher/entity-searcher';
import { AutofocusDirective } from '../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../shared/directives/uppercase.directive';
import { TableColumn } from '../../../../shared/models/table-column.model';
import { PageChange } from '../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../shared/services/app-dialog.service';
import { SectorOutput } from '../../interfaces/sector.interface';
import { ZonaInput, ZonaOutput } from '../../interfaces/zona.interface';
import { SectorService } from '../../services/sector.service';
import { ZonaService } from '../../services/zona.service';
import { SectorFormComponent } from '../sector-form/sector-form.component';

@Component({
  selector: 'app-zona-form',
  imports: [
    ReactiveFormsModule,
    UiButtonComponent,
    AutofocusDirective,
    UppercaseDirective,
    EntitySearcherComponent,
  ],
  templateUrl: './zona-form.component.html',
  styleUrl: './zona-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZonaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly zonaService = inject(ZonaService);
  private readonly sectorService = inject(SectorService);
  private readonly dialogService = inject(AppDialogService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly zona = input<ZonaOutput | null>(null);
  readonly idSector = input<number | null>(null);
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
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', [Validators.maxLength(255)]],
    estado: [true],
    idSector: [null as number | null, [Validators.required]],
  });

  constructor() {
    this.fetchSectoresPage(0, this.sectoresPageSize());

    effect(() => {
      const z = this.zona();
      const presetSectorId = this.idSector();
      if (z) {
        this.isEdit = !!z.id_zona;
        if (z.sector) {
          this.selectedSector.set(z.sector);
        }
        this.form.reset({
          nombre: z.nombre,
          descripcion: z.descripcion ?? '',
          estado: z.estado ?? true,
          idSector: z.sector?.id_sector ?? null,
        });
      } else {
        this.isEdit = false;
        this.selectedSector.set(null);
        this.form.reset({
          nombre: '',
          descripcion: '',
          estado: true,
          idSector: presetSectorId,
        });
        if (presetSectorId) {
          this.sectorService.findById(presetSectorId).subscribe({
            next: (sector) => this.selectedSector.set(sector),
          });
        }
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
    const payload: ZonaInput = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      estado: v.estado,
      idSector: Number(v.idSector),
    };

    this.saving = true;
    this.error = null;
    const current = this.zona();
    const request =
      current?.id_zona != null
        ? this.zonaService.update(current.id_zona, payload)
        : this.zonaService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar la zona';
      },
    });
  }
}
