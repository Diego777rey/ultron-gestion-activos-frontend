import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';
import { EtapaOrdenTrabajo, OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import {
  OtStepDef,
  OtStepperHeaderComponent,
} from '../../components/ot-stepper-header/ot-stepper-header.component';
import { OtRecepcionStepComponent } from '../../components/ot-recepcion-step/ot-recepcion-step.component';
import { OtDiagnosticoStepComponent } from '../../components/ot-diagnostico-step/ot-diagnostico-step.component';
import { OtEnProcesoStepComponent } from '../../components/ot-en-proceso-step/ot-en-proceso-step.component';
import { OtFinalizadaStepComponent } from '../../components/ot-finalizada-step/ot-finalizada-step.component';
import { OtFacturadoStepComponent } from '../../components/ot-facturado-step/ot-facturado-step.component';

@Component({
  selector: 'app-orden-trabajo-detalle',
  imports: [
    UiButtonComponent,
    OtStepperHeaderComponent,
    OtRecepcionStepComponent,
    OtDiagnosticoStepComponent,
    OtEnProcesoStepComponent,
    OtFinalizadaStepComponent,
    OtFacturadoStepComponent,
  ],
  templateUrl: './orden-trabajo-detalle.component.html',
  styleUrl: './orden-trabajo-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdenTrabajoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ordenService = inject(OrdenTrabajoService);

  private readonly recepcionStep = viewChild(OtRecepcionStepComponent);
  private readonly diagnosticoStep = viewChild(OtDiagnosticoStepComponent);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly orden = signal<OrdenTrabajoOutput | null>(null);
  /** Paso que el usuario eligió ver. Null sigue a la etapa real de la orden. */
  private readonly pasoManual = signal<number | null>(null);
  private ultimaEtapa = 0;

  protected readonly steps: OtStepDef[] = [
    { index: 1, etapa: 'RECEPCION', label: 'Recepción', icon: 'login' },
    { index: 2, etapa: 'DIAGNOSTICO', label: 'Diagnóstico', icon: 'search' },
    { index: 3, etapa: 'EN_PROCESO', label: 'En Proceso', icon: 'build' },
    { index: 4, etapa: 'FINALIZADA', label: 'Finalizada', icon: 'check_circle' },
    { index: 5, etapa: 'FACTURADO', label: 'Facturado', icon: 'receipt' },
  ];

  protected readonly etapaStep = computed(() => {
    const o = this.orden();
    if (!o?.etapa) return 1;
    const step = this.steps.find((s) => s.etapa === (o.etapa as EtapaOrdenTrabajo));
    return step ? step.index : 1;
  });

  protected readonly pasoMostrado = computed(() => {
    const manual = this.pasoManual();
    const etapa = this.etapaStep();
    if (manual == null || manual > etapa || manual < 1) return etapa;
    return manual;
  });

  protected readonly revisando = computed(() => this.pasoMostrado() < this.etapaStep());

  protected readonly tituloPaso = computed(() => {
    const step = this.steps.find((s) => s.index === this.pasoMostrado());
    return step?.label ?? '';
  });

  protected readonly tituloEtapa = computed(() => {
    const step = this.steps.find((s) => s.index === this.etapaStep());
    return step?.label ?? '';
  });

  constructor() {
    effect(() => {
      const etapa = this.etapaStep();
      if (etapa === this.ultimaEtapa) return;
      this.ultimaEtapa = etapa;
      this.pasoManual.set(null);
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarOrden(id);
    }
  }

  protected verPaso(index: number): void {
    if (index < 1 || index > this.etapaStep()) return;
    this.error.set(null);
    this.pasoManual.set(index === this.etapaStep() ? null : index);
  }

  protected volverPaso(): void {
    this.verPaso(this.pasoMostrado() - 1);
  }

  protected onOrdenChange(orden: OrdenTrabajoOutput): void {
    const eraNueva = !this.orden()?.id_orden_trabajo && !!orden.id_orden_trabajo;
    this.orden.set(orden);
    if (eraNueva && orden.id_orden_trabajo) {
      this.router.navigate(['/taller/orden-de-trabajo/detalle', orden.id_orden_trabajo], {
        replaceUrl: true,
      });
    }
  }

  protected onError(message: string): void {
    this.error.set(message);
  }

  protected irAlListado(): void {
    this.router.navigate(['/taller/orden-de-trabajo']);
  }

  protected accionPrincipal(): void {
    switch (this.etapaStep()) {
      case 1:
        this.iniciarDiagnostico();
        break;
      case 2:
        this.aprobarEIniciarReparacion();
        break;
      case 3:
        this.finalizarTrabajo();
        break;
      default:
        this.irAlListado();
    }
  }

  protected labelAccionPrincipal(): string {
    switch (this.etapaStep()) {
      case 1:
        return 'Iniciar diagnóstico';
      case 2:
        return 'Aprobar e iniciar reparación';
      case 3:
        return 'Finalizar trabajo';
      default:
        return 'Volver al listado';
    }
  }

  private cargarOrden(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.ordenService.findById(id, true).subscribe({
      next: (data) => {
        this.orden.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudo cargar la orden. ' + (err?.message ?? ''));
        this.loading.set(false);
      },
    });
  }

  private iniciarDiagnostico(): void {
    const step = this.recepcionStep();
    if (!step?.buildInput()) return;

    this.saving.set(true);
    this.error.set(null);
    void step.encolar().then((data) => {
      if (!data?.id_orden_trabajo) {
        this.saving.set(false);
        if (!this.error()) {
          this.error.set('Completá la recepción para iniciar el diagnóstico');
        }
        return;
      }
      this.orden.set(data);
      if (data.etapa !== 'RECEPCION') {
        this.saving.set(false);
        return;
      }
      this.ordenService.cambiarEtapa(data.id_orden_trabajo, 'DIAGNOSTICO').subscribe({
        next: (adv) => {
          this.orden.set(adv);
          this.saving.set(false);
          this.router.navigate(['/taller/orden-de-trabajo/detalle', adv.id_orden_trabajo], {
            replaceUrl: true,
          });
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Orden guardada, pero no se pudo avanzar de etapa');
          this.saving.set(false);
        },
      });
    });
  }

  /** Guarda el diagnóstico y avanza a EN_PROCESO. */
  private aprobarEIniciarReparacion(): void {
    const error = this.diagnosticoStep()?.validarParaAvanzar();
    if (error) {
      this.error.set(error);
      return;
    }
    this.persistirDiagnostico();
  }

  private persistirDiagnostico(): void {
    const orden = this.orden();
    const step = this.diagnosticoStep();
    if (!orden?.id_orden_trabajo || !step) return;

    this.saving.set(true);
    this.error.set(null);
    const input = step.buildInput();

    this.ordenService.update(orden.id_orden_trabajo, input).subscribe({
      next: (res) => {
        this.orden.set(res);
        this.ordenService.cambiarEtapa(res.id_orden_trabajo!, 'EN_PROCESO').subscribe({
          next: (adv) => {
            this.orden.set(adv);
            this.saving.set(false);
          },
          error: (err) => {
            this.error.set(err?.message ?? 'Error al avanzar a En Proceso');
            this.saving.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al guardar diagnóstico');
        this.saving.set(false);
      },
    });
  }

  private finalizarTrabajo(): void {
    const orden = this.orden();
    if (!orden?.id_orden_trabajo) return;

    this.saving.set(true);
    this.error.set(null);
    this.ordenService.cambiarEtapa(orden.id_orden_trabajo, 'FINALIZADA').subscribe({
      next: (adv) => {
        this.orden.set(adv);
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'No se pudo finalizar el trabajo');
        this.saving.set(false);
      },
    });
  }

}
