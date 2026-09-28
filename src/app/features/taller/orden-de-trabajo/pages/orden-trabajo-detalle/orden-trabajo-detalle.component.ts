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
  private readonly finalizadaStep = viewChild(OtFinalizadaStepComponent);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly orden = signal<OrdenTrabajoOutput | null>(null);
  /** Paso que el usuario eligió ver. Null sigue a la etapa real de la orden. */
  private readonly pasoManual = signal<number | null>(null);
  private ultimaEtapa = 0;

  private montoPagoPendiente: number | null = null;
  private observacionesPendientes: string | null = null;

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

  protected onMontoPagoChange(monto: number | null): void {
    this.montoPagoPendiente = monto;
  }

  protected onObservacionesChange(obs: string | null): void {
    this.observacionesPendientes = obs;
  }

  protected guardarDatosPago(): void {
    const orden = this.orden();
    if (!orden?.id_orden_trabajo) return;

    this.saving.set(true);
    this.error.set(null);

    const input = {
      monto_pago: this.montoPagoPendiente,
      observaciones_finalizacion: this.observacionesPendientes,
    };

    this.ordenService.update(orden.id_orden_trabajo, input).subscribe({
      next: (res) => {
        this.orden.set(res);
        this.saving.set(false);
        this.montoPagoPendiente = null;
        this.observacionesPendientes = null;
      },
      error: (err) => {
        this.error.set(err?.message ?? 'No se pudo guardar los datos de pago');
        this.saving.set(false);
      },
    });
  }

  protected puedeImprimir(): boolean {
    const orden = this.orden();
    return !!(orden?.monto_pago && orden.etapa === 'FINALIZADA');
  }

  protected imprimirRecibo(): void {
    const orden = this.orden();
    if (!orden || !this.puedeImprimir()) return;

    this.generarRecibo(orden);
  }

  private generarRecibo(orden: OrdenTrabajoOutput): void {
    const ventana = window.open('', '_blank', 'width=800,height=600');
    if (!ventana) {
      this.error.set('No se pudo abrir la ventana de impresión. Verificá que no esté bloqueada por el navegador.');
      return;
    }

    const html = this.construirHtmlRecibo(orden);
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    
    setTimeout(() => {
      ventana.print();
    }, 250);
  }

  private construirHtmlRecibo(orden: OrdenTrabajoOutput): string {
    const fecha = orden.fecha_finalizacion
      ? new Date(orden.fecha_finalizacion).toLocaleString('es-PY', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    const clienteNombre = orden.cliente?.persona
      ? `${orden.cliente.persona.nombre} ${orden.cliente.persona.apellido}`.toUpperCase()
      : '';
    const clienteDoc = orden.cliente?.persona?.documento ?? '';

    const vehiculoInfo = orden.vehiculo
      ? `${orden.vehiculo.marca || ''} ${orden.vehiculo.modelo || ''}`.trim()
      : '';
    const chapa = orden.vehiculo?.chapa ?? '';

    let lineasDetalles = '';
    if (orden.detalles && orden.detalles.length > 0) {
      orden.detalles.forEach((det) => {
        const nombre = det.nombre_producto || det.nombre_servicio || det.descripcion || '';
        const cant = det.cantidad?.toLocaleString('es-PY') ?? '';
        const precio = det.precio_unitario?.toLocaleString('es-PY', { minimumFractionDigits: 0 }) ?? '';
        const subtotal = det.subtotal?.toLocaleString('es-PY', { minimumFractionDigits: 0 }) ?? '';
        const tipo = det.tipo === 'PRODUCTO' ? 'REPUESTO' : 'SERVICIO';
        
        lineasDetalles += `
          <tr>
            <td style="padding: 4px; border-bottom: 1px solid #ddd;">${tipo}</td>
            <td style="padding: 4px; border-bottom: 1px solid #ddd;">${nombre}</td>
            <td style="padding: 4px; text-align: right; border-bottom: 1px solid #ddd;">${cant}</td>
            <td style="padding: 4px; text-align: right; border-bottom: 1px solid #ddd;">${precio}</td>
            <td style="padding: 4px; text-align: right; border-bottom: 1px solid #ddd;">${subtotal}</td>
          </tr>
        `;
      });
    }

    const total = (orden.diagnostico?.total_presupuesto ?? 0).toLocaleString('es-PY', { minimumFractionDigits: 0 });
    const montoPago = (orden.monto_pago ?? 0).toLocaleString('es-PY', { minimumFractionDigits: 0 });
    const observaciones = orden.observaciones_finalizacion ?? '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Recibo OT ${orden.numero_orden}</title>
        <style>
          @media print {
            body { margin: 0; }
            @page { margin: 10mm; }
          }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 11px;
            line-height: 1.3;
            color: #000;
            padding: 10px;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
          }
          .header h1 {
            margin: 0;
            font-size: 16px;
            font-weight: bold;
          }
          .header p {
            margin: 2px 0;
            font-size: 10px;
          }
          .section {
            margin-bottom: 10px;
          }
          .section-title {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 5px;
            text-decoration: underline;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th {
            background-color: #333;
            color: white;
            padding: 5px;
            text-align: left;
            font-size: 10px;
          }
          td {
            padding: 4px;
            font-size: 10px;
          }
          .total-row {
            font-weight: bold;
            background-color: #f0f0f0;
          }
          .footer {
            margin-top: 20px;
            border-top: 1px solid #000;
            padding-top: 8px;
            font-size: 9px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CH SERVICE</h1>
          <p>ELECTRICIDAD - ELECTRÓNICA - AUTOMOTRIZ</p>
          <p>PROGRAMACIÓN DE ECU - REHABILITACIÓN DE INMOVVILIZADOR - LLAVE CON CHIP - FOTOCOPIADO DE LLAVE CON CHIP</p>
          <p>ORDEN DE TRABAJO</p>
        </div>

        <div class="section">
          <p><strong>FECHA:</strong> ${fecha}</p>
          <p><strong>HORA:</strong> ${fecha.split(' ')[1] || ''}</p>
          <p><strong>NÚMERO:</strong> ${orden.numero_orden}</p>
        </div>

        <div class="section">
          <p><strong>CLIENTE:</strong> ${clienteNombre}</p>
          <p><strong>RUC:</strong> ${clienteDoc}</p>
          <p><strong>VEHÍCULO:</strong> ${vehiculoInfo}</p>
          <p><strong>CHAPA:</strong> ${chapa}</p>
        </div>

        <div class="section">
          <div class="section-title">SERVICIOS</div>
          <table>
            <thead>
              <tr>
                <th>TIPO</th>
                <th>DESCRIPCIÓN</th>
                <th style="text-align: right;">CANT.</th>
                <th style="text-align: right;">PRECIO</th>
                <th style="text-align: right;">SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${lineasDetalles}
              <tr class="total-row">
                <td colspan="4" style="text-align: right; padding: 8px;">TOTAL:</td>
                <td style="text-align: right; padding: 8px;">₲ ${total}</td>
              </tr>
              <tr class="total-row">
                <td colspan="4" style="text-align: right; padding: 8px;">MONTO PAGADO:</td>
                <td style="text-align: right; padding: 8px;">₲ ${montoPago}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${observaciones ? `
        <div class="section">
          <div class="section-title">OBSERVACIONES</div>
          <p>${observaciones}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>*** GRACIAS POR SU PREFERENCIA ***</p>
        </div>
      </body>
      </html>
    `;
  }
}
