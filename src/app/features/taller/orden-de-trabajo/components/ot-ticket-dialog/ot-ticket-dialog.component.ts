import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../../shared/components/modal/modal';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { ImpresionService } from '../../../../../shared/services/impresion.service';
import { TicketCampo, TicketOrdenTrabajo } from '../../../../../shared/models/impresion.model';
import { layoutTicketOrdenTrabajo } from '../../../../../shared/printing/escpos-ticket-builder';
import {
  CHSERVICE_LOGO_HEIGHT,
  CHSERVICE_LOGO_WIDTH,
  chserviceLogoRaster,
} from '../../../../../shared/printing/chservice-logo';
import { OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { nombreCompletoPersona } from '../../../../personas/shared/nombre-persona';

const CONDICIONES_KEY = 'ot-ticket-condiciones';

const COMPONENTES = [
  'ECU', 'Tablero', 'Inmo box', 'BCM', 'Llave', 'Antena', 'Chip', 'ABS',
  'Modulo airbag', 'Modulo 2', 'Modulo 3',
];

const SERVICIOS = ['Programacion', 'Diagnostico', 'Test en banco', 'Reparacion de hardware', 'Presupuesto'];

type CampoTexto =
  | 'empresa' | 'direccion' | 'telefono' | 'numero' | 'fecha' | 'hora'
  | 'cliente' | 'celular' | 'ruc' | 'codigoUnidad' | 'vehiculo' | 'vin' | 'descripcionProblema';

@Component({
  selector: 'app-ot-ticket-dialog',
  imports: [FormsModule, ModalComponent, UiButtonComponent],
  templateUrl: './ot-ticket-dialog.component.html',
  styleUrl: './ot-ticket-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtTicketDialogComponent {
  private readonly impresion = inject(ImpresionService);

  readonly open = input<boolean>(false);
  readonly orden = input.required<OrdenTrabajoOutput>();
  readonly closed = output<void>();

  protected readonly ticket = signal<TicketOrdenTrabajo>(ticketDesdeOrden({}));
  protected readonly imprimiendo = signal(false);
  protected readonly renglones = computed(() => layoutTicketOrdenTrabajo(this.ticket()));
  protected readonly logoUrl = logoDataUrl();

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const orden = this.orden();
      untracked(() => this.ticket.set(ticketDesdeOrden(orden)));
    });
  }

  protected set(campo: CampoTexto, valor: string): void {
    this.ticket.update((t) => ({ ...t, [campo]: valor ?? '' }));
  }

  protected setNumero(campo: 'pagoRevision' | 'recargoUrgente', valor: number | null): void {
    const numero = valor == null || Number.isNaN(Number(valor)) ? null : Number(valor);
    this.ticket.update((t) => ({ ...t, [campo]: numero }));
  }

  protected setItem(lista: 'componentes' | 'servicios', index: number, valor: string): void {
    this.ticket.update((t) => ({
      ...t,
      [lista]: t[lista].map((c, i) => (i === index ? { ...c, valor: valor ?? '' } : c)),
    }));
  }

  protected imprimir(): void {
    const ticket = this.ticket();
    guardarCondiciones(ticket);
    this.imprimiendo.set(true);
    this.impresion.imprimirTicketOrdenTrabajo(ticket).subscribe({
      next: () => this.imprimiendo.set(false),
      error: () => this.imprimiendo.set(false),
    });
  }
}

function ticketDesdeOrden(orden: OrdenTrabajoOutput): TicketOrdenTrabajo {
  const persona = orden.cliente?.persona;
  const vehiculo = orden.vehiculo;
  const fecha = orden.fecha_creacion ? new Date(orden.fecha_creacion) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const condiciones = leerCondiciones();
  return {
    empresa: 'CH SERVICE',
    direccion: 'Elizabet c/ Tercera (Barrio Rincon) Ñemby - PY',
    telefono: '0992 752 201',
    numero: orden.numero_orden ?? '',
    fecha: `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()}`,
    hora: `${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`,
    cliente: nombreCompletoPersona(persona),
    celular: persona?.telefono ?? '',
    ruc: orden.cliente?.ruc || persona?.documento || '',
    codigoUnidad: vehiculo?.chapa ?? '',
    vehiculo: [vehiculo?.marca, vehiculo?.modelo, vehiculo?.anio].filter(Boolean).join(' '),
    vin: '',
    componentes: COMPONENTES.map((etiqueta): TicketCampo => ({ etiqueta, valor: '' })),
    servicios: SERVICIOS.map((etiqueta): TicketCampo => ({ etiqueta, valor: '' })),
    descripcionProblema: orden.recepcion?.descripcion_falla ?? '',
    pagoRevision: condiciones.pagoRevision,
    recargoUrgente: condiciones.recargoUrgente,
  };
}

function leerCondiciones(): Pick<TicketOrdenTrabajo, 'pagoRevision' | 'recargoUrgente'> {
  try {
    const raw = JSON.parse(localStorage.getItem(CONDICIONES_KEY) ?? '{}');
    return {
      pagoRevision: typeof raw.pagoRevision === 'number' ? raw.pagoRevision : null,
      recargoUrgente: typeof raw.recargoUrgente === 'number' ? raw.recargoUrgente : 36,
    };
  } catch {
    return { pagoRevision: null, recargoUrgente: 36 };
  }
}

function guardarCondiciones(ticket: TicketOrdenTrabajo): void {
  try {
    localStorage.setItem(
      CONDICIONES_KEY,
      JSON.stringify({ pagoRevision: ticket.pagoRevision, recargoUrgente: ticket.recargoUrgente }),
    );
  } catch {
    // Sin localStorage el ticket se imprime igual; solo no se recuerdan los valores.
  }
}

function logoDataUrl(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = CHSERVICE_LOGO_WIDTH;
  canvas.height = CHSERVICE_LOGO_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const rows = chserviceLogoRaster();
  const bytesPorFila = Math.ceil(CHSERVICE_LOGO_WIDTH / 8);
  const image = ctx.createImageData(CHSERVICE_LOGO_WIDTH, CHSERVICE_LOGO_HEIGHT);
  for (let y = 0; y < CHSERVICE_LOGO_HEIGHT; y++) {
    for (let x = 0; x < CHSERVICE_LOGO_WIDTH; x++) {
      const negro = (rows[y * bytesPorFila + (x >> 3)] >> (7 - (x & 7))) & 1;
      const i = (y * CHSERVICE_LOGO_WIDTH + x) * 4;
      const v = negro ? 0 : 255;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}
