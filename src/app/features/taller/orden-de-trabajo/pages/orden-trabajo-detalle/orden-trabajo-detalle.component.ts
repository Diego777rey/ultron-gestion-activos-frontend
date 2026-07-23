import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
  private readonly enProcesoStep = viewChild(OtEnProcesoStepComponent);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly orden = signal<OrdenTrabajoOutput | null>(null);
  protected readonly isEdit = signal(false);
  protected readonly cajaSeleccionada = signal<string | null>(null);

  protected readonly steps: OtStepDef[] = [
    { index: 1, etapa: 'RECEPCION', label: 'Recepción', icon: 'login' },
    { index: 2, etapa: 'DIAGNOSTICO', label: 'Diagnóstico', icon: 'search' },
    { index: 3, etapa: 'EN_PROCESO', label: 'En Proceso', icon: 'build' },
    { index: 4, etapa: 'FINALIZADA', label: 'Finalizada', icon: 'check_circle' },
    { index: 5, etapa: 'FACTURADO', label: 'Facturado', icon: 'receipt' },
  ];

  protected readonly currentStep = computed(() => {
    const o = this.orden();
    if (!o?.etapa) return 1;
    const step = this.steps.find((s) => s.etapa === (o.etapa as EtapaOrdenTrabajo));
    return step ? step.index : 1;
  });

  protected readonly tituloPaso = computed(() => {
    const step = this.steps.find((s) => s.index === this.currentStep());
    return step?.label ?? '';
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.cargarOrden(id);
    } else {
      this.isEdit.set(false);
    }
  }

  protected cancelar(): void {
    this.router.navigate(['/taller/orden-de-trabajo']);
  }

  protected onOrdenChange(orden: OrdenTrabajoOutput): void {
    this.orden.set(orden);
  }

  protected onError(message: string): void {
    this.error.set(message);
  }

  protected accionPrincipal(): void {
    switch (this.currentStep()) {
      case 1:
        this.guardarRecepcion();
        break;
      case 2:
        this.guardarDiagnostico();
        break;
      case 3:
        this.enviarACaja();
        break;
      case 4:
        this.marcarFacturada();
        break;
      default:
        this.cancelar();
    }
  }

  protected labelAccionPrincipal(): string {
    switch (this.currentStep()) {
      case 1:
        return this.isEdit() ? 'Guardar e iniciar diagnóstico' : 'Iniciar diagnóstico';
      case 2:
        return 'Aprobar e iniciar proceso';
      case 3:
        return 'Finalizar y enviar a caja';
      case 4:
        return 'Marcar facturado';
      default:
        return 'Volver al listado';
    }
  }

  private cargarOrden(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.ordenService.findById(id).subscribe({
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

  private guardarRecepcion(): void {
    const input = this.recepcionStep()?.buildInput();
    if (!input) return;

    this.saving.set(true);
    this.error.set(null);
    const existingId = this.orden()?.id_orden_trabajo;
    const request$ =
      this.isEdit() && existingId
        ? this.ordenService.update(existingId, input)
        : this.ordenService.create(input);

    request$.subscribe({
      next: (data) => {
        this.orden.set(data);
        this.isEdit.set(true);
        if (data.etapa === 'RECEPCION' && data.id_orden_trabajo) {
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
              if (data.id_orden_trabajo) {
                this.router.navigate(['/taller/orden-de-trabajo/detalle', data.id_orden_trabajo], {
                  replaceUrl: true,
                });
              }
            },
          });
        } else {
          this.saving.set(false);
        }
      },
      error: (err) => {
        this.error.set(err?.message ?? 'No se pudo guardar la orden');
        this.saving.set(false);
      },
    });
  }

  private guardarDiagnostico(): void {
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

  private enviarACaja(): void {
    const orden = this.orden();
    const idCaja =
      this.cajaSeleccionada() || this.enProcesoStep()?.getSelectedCajaId() || null;
    if (!orden?.id_orden_trabajo) return;
    if (!idCaja) {
      this.error.set('Selecciona una caja con sesión abierta');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.ordenService.enviarACaja(orden.id_orden_trabajo, idCaja).subscribe({
      next: (adv) => {
        this.orden.set(adv);
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'No se pudo enviar a caja');
        this.saving.set(false);
      },
    });
  }

  private marcarFacturada(): void {
    const orden = this.orden();
    if (!orden?.id_orden_trabajo) return;

    this.saving.set(true);
    this.error.set(null);
    this.ordenService.marcarFacturada(orden.id_orden_trabajo).subscribe({
      next: (adv) => {
        this.orden.set(adv);
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'No se pudo marcar como facturada');
        this.saving.set(false);
      },
    });
  }
}
