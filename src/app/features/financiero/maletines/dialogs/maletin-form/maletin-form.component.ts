import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { MaletinInput, MaletinOutput } from '../../interfaces/maletin.interface';
import { MaletinService } from '../../services/maletin.service';

@Component({
  selector: 'app-maletin-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './maletin-form.component.html',
  styleUrl: './maletin-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaletinFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly maletinService = inject(MaletinService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly maletin = input<MaletinOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    balancePyg: [0, [Validators.min(0)]],
    balanceUsd: [0, [Validators.min(0)]],
    balanceBrl: [0, [Validators.min(0)]],
    activo: [true],
  });

  constructor() {
    effect(() => {
      const m = this.maletin();
      if (m) {
        this.isEdit = !!m.id_maletin;
        this.form.reset({
          nombre: m.nombre,
          balancePyg: m.balancePyg ?? 0,
          balanceUsd: m.balanceUsd ?? 0,
          balanceBrl: m.balanceBrl ?? 0,
          activo: m.activo ?? true,
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          nombre: '',
          balancePyg: 0,
          balanceUsd: 0,
          balanceBrl: 0,
          activo: true,
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
    const payload: MaletinInput = {
      nombre: v.nombre.trim(),
      balancePyg: v.balancePyg,
      balanceUsd: v.balanceUsd,
      balanceBrl: v.balanceBrl,
      activo: v.activo,
    };

    this.saving = true;
    this.error = null;
    const current = this.maletin();
    const request =
      current?.id_maletin != null
        ? this.maletinService.update(current.id_maletin, payload)
        : this.maletinService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el maletín';
      },
    });
  }
}
