import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OrdenTrabajoInput, OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OtDetalleLineasComponent } from '../ot-detalle-lineas/ot-detalle-lineas.component';
import { OtDiagnosticoHallazgosComponent } from '../ot-diagnostico-hallazgos/ot-diagnostico-hallazgos.component';

@Component({
  selector: 'app-ot-diagnostico-step',
  imports: [ReactiveFormsModule, OtDetalleLineasComponent, OtDiagnosticoHallazgosComponent],
  templateUrl: './ot-diagnostico-step.component.html',
  styleUrls: [
    '../../styles/ot-form.scss',
    '../../styles/ot-diagnostico.scss',
    './ot-diagnostico-step.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtDiagnosticoStepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly orden = input.required<OrdenTrabajoOutput>();
  readonly formReady = output<FormGroup>();
  readonly ordenChange = output<OrdenTrabajoOutput>();
  readonly errorChange = output<string>();

  protected readonly form = this.fb.group({
    fecha_inicio_estimada: [''],
    fecha_fin_estimada: [''],
    observaciones: [''],
    presupuesto_aprobado: [false],
  });

  protected readonly resumenCliente = computed(() => {
    const p = this.orden().cliente?.persona;
    if (!p) return '—';
    return `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || '—';
  });

  protected readonly resumenVehiculo = computed(() => {
    const v = this.orden().vehiculo;
    if (!v) return '—';
    const partes = [v.chapa, v.marca, v.modelo].filter(Boolean);
    return partes.length ? partes.join(' · ') : '—';
  });

  protected readonly resumenMecanico = computed(() => {
    const list = this.orden().mecanicos?.length
      ? this.orden().mecanicos
      : this.orden().mecanico
        ? [this.orden().mecanico]
        : [];
    const names = (list ?? [])
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map((m) => `${m.persona?.nombre ?? ''} ${m.persona?.apellido ?? ''}`.trim())
      .filter(Boolean);
    return names.length ? names.join(', ') : '—';
  });

  protected readonly condicionesIngreso = computed(() => {
    const e = this.orden().estado_vehiculo;
    if (!e) return [];
    const flags: { flag: boolean | null | undefined; label: string }[] = [
      { flag: e.falla_mecanica, label: 'Falla mecánica' },
      { flag: e.falla_electrica, label: 'Falla eléctrica' },
      { flag: e.estado_llantas, label: 'Llantas' },
      { flag: e.estado_pintura, label: 'Pintura' },
      { flag: e.estado_rayones, label: 'Rayones' },
      { flag: e.estado_golpes, label: 'Golpes' },
      { flag: e.estado_vidrios, label: 'Vidrios' },
      { flag: e.perdida_aceite, label: 'Pérdida de aceite' },
      { flag: e.luces_danadas, label: 'Luces dañadas' },
      { flag: e.espejos_danados, label: 'Espejos dañados' },
      { flag: e.accesorios_faltantes, label: 'Accesorios faltantes' },
    ];
    return flags.filter((f) => !!f.flag).map((f) => f.label);
  });

  protected resumenDuracion(): string {
    const val = this.form.getRawValue();
    if (!val.fecha_inicio_estimada || !val.fecha_fin_estimada) {
      return '—';
    }
    const dias = this.diffDaysInclusive(val.fecha_inicio_estimada, val.fecha_fin_estimada);
    return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  ngOnInit(): void {
    this.formReady.emit(this.form);
    const d = this.orden().diagnostico;
    this.form.patchValue({
      fecha_inicio_estimada: this.formatDate(d?.fecha_inicio_estimada),
      fecha_fin_estimada: this.formatDate(d?.fecha_fin_estimada),
      observaciones: d?.observaciones ?? '',
      presupuesto_aprobado: d?.presupuesto_aprobado ?? false,
    });
  }

  buildInput(): OrdenTrabajoInput {
    const val = this.form.getRawValue();
    const inicio = val.fecha_inicio_estimada || null;
    const fin = val.fecha_fin_estimada || null;
    const dias = inicio && fin ? this.diffDaysInclusive(inicio, fin) : null;
    return {
      diagnostico: {
        fecha_inicio_estimada: inicio,
        fecha_fin_estimada: fin,
        duracion_estimada_dias: dias,
        observaciones: val.observaciones?.trim() || null,
        presupuesto_aprobado: val.presupuesto_aprobado,
      },
    };
  }

  validarParaAvanzar(): string | null {
    const orden = this.orden();
    if (!orden.hallazgos?.length) {
      return 'Registrá al menos un fallo o defecto encontrado';
    }
    if (!orden.detalles?.length) {
      return 'El presupuesto debe tener al menos un producto o servicio';
    }
    const val = this.form.getRawValue();
    if (!val.fecha_inicio_estimada || !val.fecha_fin_estimada) {
      return 'Indicá la fecha de inicio y la fecha de fin estimadas';
    }
    if (val.fecha_fin_estimada < val.fecha_inicio_estimada) {
      return 'La fecha de fin no puede ser anterior a la de inicio';
    }
    if (!val.presupuesto_aprobado) {
      return 'El presupuesto debe estar aprobado por el cliente';
    }
    return null;
  }

  private formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  }

  private diffDaysInclusive(start: string, end: string): number {
    const [ys, ms, ds] = start.split('-').map(Number);
    const [ye, me, de] = end.split('-').map(Number);
    const a = new Date(ys, ms - 1, ds);
    const b = new Date(ye, me - 1, de);
    const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
    return Math.max(diff, 1);
  }
}
