import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { CajaInput, CajaOutput } from '../../interfaces/caja.interface';
import { CajaService } from '../../services/caja.service';

@Component({
  selector: 'app-caja-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './caja-form.component.html',
  styleUrl: './caja-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cajaService = inject(CajaService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly caja = input<CajaOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    saldoActual: [0, [Validators.min(0)]],
    activa: [true],
  });

  constructor() {
    effect(() => {
      const c = this.caja();
      if (c) {
        this.isEdit = !!c.id_caja;
        this.form.reset({
          nombre: c.nombre,
          saldoActual: c.saldoActual ?? 0,
          activa: c.activa ?? true,
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          nombre: '',
          saldoActual: 0,
          activa: true,
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
    const payload: CajaInput = {
      nombre: v.nombre.trim(),
      saldoActual: v.saldoActual,
      activa: v.activa,
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
