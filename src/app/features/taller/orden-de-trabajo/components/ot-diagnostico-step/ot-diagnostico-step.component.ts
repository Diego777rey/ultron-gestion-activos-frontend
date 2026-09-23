import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, Subject, catchError, concatMap, debounceTime, tap } from 'rxjs';
import { ReporteService } from '../../../../../shared/services/reporte.service';
import { OrdenTrabajoInput, OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly ordenService = inject(OrdenTrabajoService);
  private readonly reporteService = inject(ReporteService);
  private readonly persistir$ = new Subject<'auto' | 'pdf'>();
  private ultimoGuardado = '';

  readonly orden = input.required<OrdenTrabajoOutput>();
  readonly editable = input(true);
  readonly formReady = output<FormGroup>();
  readonly ordenChange = output<OrdenTrabajoOutput>();
  readonly errorChange = output<string>();

  protected readonly form = this.fb.group({
    fecha_inicio_estimada: [''],
    fecha_fin_estimada: [''],
    observaciones: [''],
    presupuesto_aprobado: [false],
  });

  protected readonly estadoGuardado = signal<'idle' | 'guardando' | 'guardado'>('idle');

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
    this.form.patchValue(
      {
        fecha_inicio_estimada: this.formatDate(d?.fecha_inicio_estimada),
        fecha_fin_estimada: this.formatDate(d?.fecha_fin_estimada),
        observaciones: d?.observaciones ?? '',
        presupuesto_aprobado: d?.presupuesto_aprobado ?? false,
      },
      { emitEvent: false },
    );
    this.ultimoGuardado = JSON.stringify(this.buildInput());
    if (!this.editable()) {
      this.form.disable({ emitEvent: false });
      return;
    }
    this.escucharCambios();
    this.destroyRef.onDestroy(() => this.guardarAlSalir());
  }

  buildInput(): OrdenTrabajoInput {
    const val = this.form.getRawValue();
    const inicio = val.fecha_inicio_estimada || '';
    const fin = val.fecha_fin_estimada || '';
    const dias = inicio && fin ? this.diffDaysInclusive(inicio, fin) : 0;
    return {
      diagnostico: {
        fecha_inicio_estimada: inicio,
        fecha_fin_estimada: fin,
        duracion_estimada_dias: dias,
        observaciones: val.observaciones?.trim() ?? '',
        presupuesto_aprobado: !!val.presupuesto_aprobado,
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

  generarPdfPresupuesto(): void {
    if (!this.editable()) {
      this.abrirReporte();
      return;
    }
    this.persistir$.next('pdf');
  }

  private guardarAlSalir(): void {
    const id = this.orden().id_orden_trabajo;
    if (!id) {
      return;
    }
    const input = this.buildInput();
    if (JSON.stringify(input) === this.ultimoGuardado) {
      return;
    }
    this.ordenService.actualizarSilencioso(id, input).subscribe({ error: () => undefined });
  }

  private escucharCambios(): void {
    this.form.valueChanges
      .pipe(debounceTime(450), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.persistir$.next('auto'));

    this.persistir$
      .pipe(
        concatMap((motivo) => this.guardar(motivo)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private guardar(motivo: 'auto' | 'pdf') {
    const id = this.orden().id_orden_trabajo;
    if (!id) {
      return EMPTY;
    }
    const input = this.buildInput();
    const firma = JSON.stringify(input);
    const abrirReporte = () => {
      if (motivo === 'pdf') this.abrirReporte();
    };

    if (firma === this.ultimoGuardado) {
      abrirReporte();
      return EMPTY;
    }

    this.estadoGuardado.set('guardando');
    return this.ordenService.actualizarSilencioso(id, input).pipe(
      tap((updated) => {
        this.ultimoGuardado = firma;
        this.estadoGuardado.set('guardado');
        this.ordenChange.emit({
          ...this.orden(),
          diagnostico: updated.diagnostico ?? this.orden().diagnostico,
        });
        abrirReporte();
      }),
      catchError((err) => {
        this.estadoGuardado.set('idle');
        this.errorChange.emit(err?.message ?? 'No se pudo guardar el diagnóstico');
        return EMPTY;
      }),
    );
  }

  private abrirReporte(): void {
    const id = this.orden().id_orden_trabajo;
    const numericId = id != null ? Number(id) : NaN;
    if (Number.isNaN(numericId)) return;
    this.reporteService
      .generar('orden_trabajo_detalle', {
        id: numericId,
        titulo: `Presupuesto OT ${this.orden().numero_orden ?? ''}`.trim(),
      })
      .subscribe({
        error: (err) =>
          this.errorChange.emit(err?.message ?? 'No se pudo generar el presupuesto'),
      });
  }

  protected puedeGenerarPdf(): boolean {
    const orden = this.orden();
    return !!(orden.detalles && orden.detalles.length > 0);
  }
}
