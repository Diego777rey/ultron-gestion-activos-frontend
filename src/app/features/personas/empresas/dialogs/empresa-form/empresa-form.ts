import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { ImageUploaderComponent } from '../../../../../shared/components/image-uploader/image-uploader.component';
import { EmpresaInput, EmpresaOutput } from '../../interfaces/empresa.interface';
import { EmpresaService } from '../../services/empresa.service';

@Component({
  selector: 'app-empresa-form',
  imports: [
    ReactiveFormsModule,
    UiButtonComponent,
    AutofocusDirective,
    UppercaseDirective,
    ImageUploaderComponent,
  ],
  templateUrl: './empresa-form.html',
  styleUrl: './empresa-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpresaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly empresaService = inject(EmpresaService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly empresa = input<EmpresaOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly logoPath = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    razon_social: ['', [Validators.required, Validators.maxLength(255)]],
    ruc: ['', [Validators.required, Validators.maxLength(20)]],
    direccion: ['', [Validators.required, Validators.maxLength(500)]],
    telefono: ['', [Validators.maxLength(50)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    actividad_economica: ['', [Validators.maxLength(500)]],
    activa: [true],
  });

  constructor() {
    effect(() => {
      const e = this.empresa();
      if (e) {
        this.isEdit = !!e.id_empresa;
        this.form.reset({
          razon_social: e.razon_social ?? '',
          ruc: e.ruc ?? '',
          direccion: e.direccion ?? '',
          telefono: e.telefono ?? '',
          email: e.email ?? '',
          actividad_economica: e.actividad_economica ?? '',
          activa: e.activa ?? true,
        });
        this.logoPath.set(e.logo ?? null);
      } else {
        this.isEdit = false;
        this.form.reset({
          razon_social: '',
          ruc: '',
          direccion: '',
          telefono: '',
          email: '',
          actividad_economica: '',
          activa: true,
        });
        this.logoPath.set(null);
      }
    });
  }

  protected onLogoChange(path: string | null): void {
    this.logoPath.set(path);
  }

  protected onLogoError(error: string): void {
    this.error = error;
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const e = this.empresa();

    const payload: EmpresaInput = {
      razon_social: v.razon_social.trim(),
      ruc: v.ruc.trim(),
      direccion: v.direccion.trim(),
      telefono: v.telefono?.trim() || undefined,
      email: v.email?.trim() || undefined,
      actividad_economica: v.actividad_economica?.trim() || undefined,
      logo: this.logoPath() || undefined,
      activa: v.activa,
    };

    this.saving = true;
    const request =
      e && e.id_empresa
        ? this.empresaService.actualizarEmpresa(e.id_empresa, payload)
        : this.empresaService.registrarEmpresa(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar la empresa';
      },
    });
  }

  protected onCancel(): void {
    this.dialogRef?.close(false);
  }
}
