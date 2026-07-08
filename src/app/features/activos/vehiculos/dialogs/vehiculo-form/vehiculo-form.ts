import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { VehiculoInput, VehiculoOutput } from '../../interfaces/vehiculo.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { VehiculoService } from '../../services/vehiculo.service';
import { ClienteService } from '../../../../personas/clientes/services/cliente.service';

@Component({
  selector: 'app-vehiculo-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './vehiculo-form.html',
  styleUrl: './vehiculo-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiculoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly vehiculoService = inject(VehiculoService);
  private readonly clienteService = inject(ClienteService);

  readonly vehiculo = input<VehiculoOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly form = this.fb.nonNullable.group({
    chapa: ['', [Validators.required, Validators.maxLength(20)]],
    marca: ['', [Validators.required, Validators.maxLength(50)]],
    modelo: ['', [Validators.required, Validators.maxLength(50)]],
    tipo_vehiculo: ['', [Validators.required, Validators.maxLength(50)]],
    anio: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(2100)]],
    descripcion: [''],
    valor: [0, [Validators.min(0)]],
    id_cliente: ['', [Validators.required]],
    cliente_doc: [''],
    cliente_nombre: [{value: '', disabled: true}],
    estado: ['ACTIVO'],
  });

  constructor() {
    effect(() => {
      const v = this.vehiculo();
      if (v) {
        this.isEdit = !!v.id_bien;
        this.form.patchValue({
          chapa: v.chapa ?? '',
          marca: v.marca ?? '',
          modelo: v.modelo ?? '',
          tipo_vehiculo: v.tipo_vehiculo ?? '',
          anio: v.anio ?? new Date().getFullYear(),
          descripcion: v.descripcion ?? '',
          valor: v.valor ?? 0,
          id_cliente: v.cliente?.id_cliente ?? '',
          cliente_doc: v.cliente?.persona?.documento ?? '',
          cliente_nombre: `${v.cliente?.persona?.nombre ?? ''} ${v.cliente?.persona?.apellido ?? ''}`.trim(),
          estado: v.estado ?? 'ACTIVO',
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          chapa: '',
          marca: '',
          modelo: '',
          tipo_vehiculo: '',
          anio: new Date().getFullYear(),
          descripcion: '',
          valor: 0,
          id_cliente: '',
          cliente_doc: '',
          cliente_nombre: '',
          estado: 'ACTIVO',
        });
      }
    });

    this.form.controls.cliente_doc.valueChanges.pipe(
      takeUntilDestroyed(),
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(doc => {
        if (!doc || doc.trim().length === 0) return of(null);
        return this.clienteService.findPaginated(0, 1, doc).pipe(
          catchError(() => of(null))
        );
      })
    ).subscribe(data => {
      const cliente = data?.content?.[0];
      if (cliente) {
        this.form.patchValue({
          id_cliente: cliente.id_cliente || '',
          cliente_nombre: `${cliente.persona?.nombre || ''} ${cliente.persona?.apellido || ''}`.trim(),
        });
      } else {
        this.form.patchValue({
          id_cliente: '',
          cliente_nombre: 'NO ENCONTRADO',
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
    const vehiculoData = this.vehiculo();
    
    const payload: VehiculoInput = {
      id_cliente: v.id_cliente,
      chapa: v.chapa.trim(),
      marca: v.marca.trim(),
      modelo: v.modelo.trim(),
      tipo_vehiculo: v.tipo_vehiculo.trim(),
      anio: v.anio,
      descripcion: v.descripcion?.trim() || null,
      valor: v.valor,
      estado: v.estado,
    };

    this.saving = true;
    const request = (vehiculoData && vehiculoData.id_bien) 
      ? this.vehiculoService.update(vehiculoData.id_bien, payload)
      : this.vehiculoService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el vehículo';
      },
    });
  }
}
