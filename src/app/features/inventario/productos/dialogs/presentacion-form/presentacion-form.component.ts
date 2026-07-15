import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { PresentacionProductoService } from '../../services/presentacion-producto.service';
import { PresentacionProductoInput, PresentacionProductoOutput } from '../../interfaces/producto.interface';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-presentacion-form',
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './presentacion-form.component.html',
  styleUrl: './presentacion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentacionFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly presentacionService = inject(PresentacionProductoService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly idProducto = input<number | null>(null);
  readonly presentacion = input<PresentacionProductoOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly tipos = ['UNIDAD', 'PACK', 'CAJA', 'DOCENA', 'MAYORISTA'];

  protected readonly form = this.fb.nonNullable.group({
    descripcion: ['', [Validators.required, Validators.maxLength(100)]],
    tipo: ['UNIDAD', [Validators.required]],
    cantidad: [1, [Validators.required, Validators.min(0)]],
    precio: [0, [Validators.required, Validators.min(0)]],
    codigoBarras: [''],
    principal: [false],
    estado: [true],
  });

  constructor() {
    effect(() => {
      const p = this.presentacion();
      if (p) {
        this.isEdit = !!p.id_presentacion_producto;
        this.form.reset({
          descripcion: p.descripcion,
          tipo: p.tipo ?? 'UNIDAD',
          cantidad: p.cantidad ?? 1,
          precio: p.precio ?? 0,
          codigoBarras: p.codigoBarras ?? '',
          principal: p.principal ?? false,
          estado: p.estado ?? true,
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          descripcion: '',
          tipo: 'UNIDAD',
          cantidad: 1,
          precio: 0,
          codigoBarras: '',
          principal: false,
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
    const p = this.presentacion();

    const payload: PresentacionProductoInput = {
      idProducto: this.idProducto() ?? undefined,
      descripcion: v.descripcion.trim(),
      tipo: v.tipo,
      cantidad: v.cantidad,
      precio: v.precio,
      codigoBarras: v.codigoBarras?.trim() || undefined,
      principal: v.principal,
      estado: v.estado,
    };

    this.saving = true;
    this.error = null;
    const request = (p && p.id_presentacion_producto)
      ? this.presentacionService.update(p.id_presentacion_producto, payload)
      : this.presentacionService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar la presentación';
      },
    });
  }
}
