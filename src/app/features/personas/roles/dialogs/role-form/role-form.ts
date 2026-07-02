import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { RoleInput, RoleOutput } from '../../interfaces/role.interface';
import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-role-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './role-form.html',
  styleUrl: './role-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleService);

  readonly role = input<RoleOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly estados = ['ACTIVO', 'INACTIVO'];

  protected readonly form = this.fb.nonNullable.group({
    descripcion: ['', [Validators.required, Validators.maxLength(255)]],
    activo: ['ACTIVO'],
  });

  constructor() {
    effect(() => {
      const r = this.role();
      if (r) {
        this.isEdit = !!r.id;
        this.form.reset({
          descripcion: r.descripcion ?? '',
          activo: r.activo ?? 'ACTIVO',
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          descripcion: '',
          activo: 'ACTIVO',
        });
      }
    });
  }

  private readonly dialogRef = inject(DialogRef, { optional: true });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const r = this.role();
    const payload: RoleInput = {
      descripcion: v.descripcion.trim(),
      activo: v.activo || 'ACTIVO',
    };

    this.saving = true;
    const request =
      r && r.id
        ? this.roleService.update(r.id, payload)
        : this.roleService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el rol';
      },
    });
  }
}
