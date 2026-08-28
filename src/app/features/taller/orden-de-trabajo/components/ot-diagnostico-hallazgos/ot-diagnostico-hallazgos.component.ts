import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import {
  OrdenDiagnosticoHallazgoInput,
  OrdenDiagnosticoHallazgoOutput,
  OrdenTrabajoOutput,
} from '../../interfaces/orden-trabajo.interface';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';

@Component({
  selector: 'app-ot-diagnostico-hallazgos',
  imports: [ReactiveFormsModule, UiButtonComponent],
  templateUrl: './ot-diagnostico-hallazgos.component.html',
  styleUrls: [
    '../../styles/ot-diagnostico.scss',
    './ot-diagnostico-hallazgos.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtDiagnosticoHallazgosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ordenService = inject(OrdenTrabajoService);

  readonly orden = input.required<OrdenTrabajoOutput>();
  readonly editable = input(true);
  readonly modoEnProceso = input(false);
  readonly ordenChange = output<OrdenTrabajoOutput>();
  readonly errorChange = output<string>();

  protected readonly tipos = [
    { value: 'FALLO', label: 'Fallo', icon: 'error' },
    { value: 'DEFECTO', label: 'Defecto', icon: 'warning' },
  ];

  protected readonly gravedades = [
    { value: 'BAJA', label: 'Baja' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'CRITICA', label: 'Crítica' },
  ];

  protected readonly sistemas = [
    { value: 'MOTOR', label: 'Motor' },
    { value: 'TRANSMISION', label: 'Transmisión' },
    { value: 'FRENOS', label: 'Frenos' },
    { value: 'SUSPENSION', label: 'Suspensión' },
    { value: 'DIRECCION', label: 'Dirección' },
    { value: 'ELECTRICO', label: 'Eléctrico' },
    { value: 'REFRIGERACION', label: 'Refrigeración' },
    { value: 'ESCAPE', label: 'Escape' },
    { value: 'CARROCERIA', label: 'Carrocería' },
    { value: 'NEUMATICOS', label: 'Neumáticos' },
    { value: 'OTRO', label: 'Otro' },
  ];

  protected readonly form = this.fb.group({
    tipo: ['FALLO', Validators.required],
    gravedad: ['MEDIA', Validators.required],
    sistema: [''],
    descripcion: ['', Validators.required],
  });

  protected readonly isAdding = signal(false);
  protected readonly sistemaOpen = signal(false);

  ngOnInit(): void {
    if (this.modoEnProceso()) {
      this.form.controls.tipo.setValue('DEFECTO');
    }
  }

  protected tituloCard(): string {
    return this.modoEnProceso() ? 'Nuevo defecto descubierto' : 'Fallos y defectos encontrados';
  }

  protected hintCard(): string {
    return this.modoEnProceso()
      ? 'Solo si durante el trabajo aparece un daño o condición que no estaba en el diagnóstico. Eso habilita un servicio extra.'
      : 'Un fallo es algo que no funciona. Un defecto es daño, desgaste o una condición irregular.';
  }

  protected hallazgosVisibles(): OrdenDiagnosticoHallazgoOutput[] {
    const all = this.orden().hallazgos ?? [];
    if (!this.modoEnProceso()) {
      return all;
    }
    return all.filter((h) => h.etapa_origen === 'EN_PROCESO');
  }

  @HostListener('document:click')
  protected closeSistema(): void {
    this.sistemaOpen.set(false);
  }

  protected toggleSistema(event: Event): void {
    event.stopPropagation();
    this.sistemaOpen.update((open) => !open);
  }

  protected pickSistema(value: string): void {
    this.form.controls.sistema.setValue(value);
    this.sistemaOpen.set(false);
  }

  protected agregar(): void {
    const orden = this.orden();
    if (this.form.invalid || !orden.id_orden_trabajo) {
      this.form.markAllAsTouched();
      return;
    }

    this.isAdding.set(true);
    const val = this.form.getRawValue();
    const input: OrdenDiagnosticoHallazgoInput = {
      tipo: this.modoEnProceso() ? 'DEFECTO' : val.tipo!,
      gravedad: val.gravedad,
      sistema: val.sistema || null,
      descripcion: val.descripcion!.trim(),
    };

    this.ordenService.agregarHallazgo(orden.id_orden_trabajo, input).subscribe({
      next: (updated) => {
        this.ordenChange.emit(updated);
        this.isAdding.set(false);
        this.form.patchValue({ descripcion: '', sistema: '' });
        this.form.markAsUntouched();
      },
      error: (err) => {
        this.errorChange.emit(err?.message ?? 'No se pudo registrar el hallazgo');
        this.isAdding.set(false);
      },
    });
  }

  protected eliminar(item: OrdenDiagnosticoHallazgoOutput): void {
    const orden = this.orden();
    if (!orden.id_orden_trabajo || !item.id_hallazgo) {
      return;
    }
    if (!confirm(this.modoEnProceso()
      ? '¿Eliminar este defecto descubierto?'
      : '¿Eliminar este hallazgo del diagnóstico?')) {
      return;
    }
    this.ordenService.eliminarHallazgo(orden.id_orden_trabajo, item.id_hallazgo).subscribe({
      next: (updated) => this.ordenChange.emit(updated),
      error: (err) => this.errorChange.emit(err?.message ?? 'No se pudo eliminar el hallazgo'),
    });
  }

  protected labelTipo(tipo: string | null | undefined): string {
    return this.tipos.find((t) => t.value === tipo)?.label ?? tipo ?? '';
  }

  protected labelGravedad(gravedad: string | null | undefined): string {
    return this.gravedades.find((g) => g.value === gravedad)?.label ?? gravedad ?? '';
  }

  protected labelSistema(sistema: string | null | undefined, vacio = 'Sin especificar'): string {
    if (!sistema) return vacio;
    return this.sistemas.find((s) => s.value === sistema)?.label ?? sistema;
  }
}
