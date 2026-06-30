import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { FuncionarioInput, FuncionarioOutput } from '../../interfaces/funcionario.interface';
import { FuncionarioService } from '../../services/funcionario.service';

@Component({
  selector: 'app-funcionario-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective],
  templateUrl: './funcionario-form.html',
  styleUrl: './funcionario-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuncionarioFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly funcionarioService = inject(FuncionarioService);

  readonly funcionario = input<FuncionarioOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    apellido: ['', [Validators.required, Validators.maxLength(80)]],
    documento: ['', [Validators.required, Validators.maxLength(30)]],
    email: ['', [Validators.email]],
    telefono: [''],
    direccion: [''],
    sueldo: ['', [Validators.min(0)]],
    sector: ['', [Validators.maxLength(255)]],
    fechaIngreso: [''],
    facePrueba: [false],
    estado: [true],
  });

  constructor() {
    effect(() => {
      const f = this.funcionario();
      if (f) {
        this.isEdit = !!f.id_funcionario;
        this.form.reset({
          nombre: f.persona?.nombre ?? '',
          apellido: f.persona?.apellido ?? '',
          documento: f.persona?.documento ?? '',
          email: f.persona?.email ?? '',
          telefono: f.persona?.telefono ?? '',
          direccion: f.persona?.direccion ?? '',
          sueldo: f.sueldo != null ? String(f.sueldo) : '',
          sector: f.sector ?? '',
          fechaIngreso: this.toInputDate(f.fechaIngreso),
          facePrueba: f.facePrueba ?? false,
          estado: f.estado ?? true,
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          nombre: '',
          apellido: '',
          documento: '',
          email: '',
          telefono: '',
          direccion: '',
          sueldo: '',
          sector: '',
          fechaIngreso: this.today(),
          facePrueba: false,
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
    const f = this.funcionario();
    const sueldo = v.sueldo.trim() ? Number(v.sueldo) : null;
    const payload: FuncionarioInput = {
      persona: {
        nombre: v.nombre.trim(),
        apellido: v.apellido.trim(),
        documento: v.documento.trim(),
        email: v.email?.trim() || null,
        telefono: v.telefono?.trim() || null,
        direccion: v.direccion?.trim() || null,
        estado: v.estado ? 'ACTIVO' : 'INACTIVO',
      },
      sueldo,
      sector: v.sector?.trim() || null,
      fechaIngreso: v.fechaIngreso?.trim() || this.today(),
      facePrueba: v.facePrueba,
      estado: v.estado,
    };

    this.saving = true;
    const request =
      f && f.id_funcionario
        ? this.funcionarioService.update(f.id_funcionario, payload)
        : this.funcionarioService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el funcionario';
      },
    });
  }

  private today(): string {
    const d = new Date();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  /** Convierte fechas del backend (dd/MM/yyyy) al formato del input date (yyyy-MM-dd). */
  private toInputDate(value: string | null | undefined): string {
    if (!value) return this.today();
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    return this.today();
  }
}
