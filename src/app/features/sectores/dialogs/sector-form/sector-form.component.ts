import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../shared/directives/uppercase.directive';
import { SectorInput, SectorOutput } from '../../interfaces/sector.interface';
import { SectorService } from '../../services/sector.service';

@Component({
  selector: 'app-sector-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './sector-form.component.html',
  styleUrl: './sector-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectorFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sectorService = inject(SectorService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly sector = input<SectorOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', [Validators.maxLength(255)]],
    estado: [true],
  });

  constructor() {
    effect(() => {
      const s = this.sector();
      if (s) {
        this.isEdit = !!s.id_sector;
        this.form.reset({
          nombre: s.nombre,
          descripcion: s.descripcion ?? '',
          estado: s.estado ?? true,
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          nombre: '',
          descripcion: '',
          estado: true,
        });
      }
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload: SectorInput = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      estado: v.estado,
    };

    this.saving = true;
    this.error = null;
    const current = this.sector();
    const request =
      current?.id_sector != null
        ? this.sectorService.update(current.id_sector, payload)
        : this.sectorService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el sector';
      },
    });
  }
}
