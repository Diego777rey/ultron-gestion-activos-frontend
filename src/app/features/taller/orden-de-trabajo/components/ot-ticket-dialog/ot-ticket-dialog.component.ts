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
import {
  EstadoReparacion,
  TicketCampo,
  TicketCondicionVehiculo,
  TicketOrdenTrabajo,
  TicketOrdenTrabajoBase,
  TicketOrdenTrabajoVehiculo,
} from '../../../../../shared/models/impresion.model';
import {
  formatGs,
  layoutTicketOrdenTrabajo,
  layoutTicketOrdenTrabajoVehiculo,
} from '../../../../../shared/printing/escpos-ticket-builder';
import {
  CHSERVICE_LOGO_HEIGHT,
  CHSERVICE_LOGO_WIDTH,
  chserviceLogoRaster,
} from '../../../../../shared/printing/chservice-logo';
import {
  OrdenEstadoVehiculoOutput,
  OrdenTrabajoOutput,
  labelSistemaHallazgo,
  tipoRecepcionDe,
} from '../../interfaces/orden-trabajo.interface';
import { nombreCompletoPersona } from '../../../../personas/shared/nombre-persona';

const CONDICIONES_KEY = 'ot-ticket-condiciones';

const COMPONENTES = [
  'ECU', 'Tablero', 'Inmo box', 'BCM', 'Llave', 'Antena', 'Chip', 'ABS',
  'Modulo airbag', 'Modulo 2', 'Modulo 3',
];

const SERVICIOS = ['Programacion', 'Diagnostico', 'Test en banco', 'Reparacion de hardware', 'Presupuesto'];

/** Condiciones del estado inicial que se imprimen en el ticket de vehículo. */
const CONDICIONES_VEHICULO: { campo: keyof OrdenEstadoVehiculoOutput; etiqueta: string }[] = [
  { campo: 'estado_llantas', etiqueta: 'Ruedas dañadas' },
  { campo: 'estado_pintura', etiqueta: 'Pintura dañada' },
  { campo: 'estado_rayones', etiqueta: 'Rayones' },
  { campo: 'estado_golpes', etiqueta: 'Golpes / abolladuras' },
  { campo: 'estado_vidrios', etiqueta: 'Vidrios dañados' },
  { campo: 'perdida_aceite', etiqueta: 'Pérdida de aceite' },
  { campo: 'luces_danadas', etiqueta: 'Luces dañadas' },
  { campo: 'espejos_danados', etiqueta: 'Espejos dañados' },
  { campo: 'accesorios_faltantes', etiqueta: 'Accesorios faltantes' },
];

const COMBUSTIBLE: Record<string, string> = {
  VACIO: 'Vacío',
  CUARTO: '1/4',
  MEDIO: '1/2',
  TRES_CUARTOS: '3/4',
  LLENO: 'Lleno',
};

type CampoBase =
  | 'empresa' | 'direccion' | 'telefono' | 'numero' | 'fecha' | 'hora'
  | 'cliente' | 'celular' | 'ruc' | 'vehiculo' | 'descripcionProblema';
type CampoEquipo = 'codigoUnidad' | 'vin';
type CampoVehiculo = 'chapa' | 'kilometraje' | 'combustible' | 'tipoFalla' | 'observacionesEstado';

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

  /** Recepción de equipo: ticket de componentes. Recepción de vehículo: ticket de estado y servicios. */
  protected readonly tipo = computed(() => tipoRecepcionDe(this.orden()));
  protected readonly ticketEquipo = signal<TicketOrdenTrabajo>(ticketEquipoDesdeOrden({}));
  protected readonly ticketVehiculo = signal<TicketOrdenTrabajoVehiculo>(ticketVehiculoDesdeOrden({}));
  protected readonly ticket = computed<TicketOrdenTrabajoBase>(() =>
    this.tipo() === 'EQUIPO' ? this.ticketEquipo() : this.ticketVehiculo(),
  );
  protected readonly renglones = computed(() =>
    this.tipo() === 'EQUIPO'
      ? layoutTicketOrdenTrabajo(this.ticketEquipo())
      : layoutTicketOrdenTrabajoVehiculo(this.ticketVehiculo()),
  );
  protected readonly imprimiendo = signal(false);
  protected readonly logoUrl = logoDataUrl();
  protected readonly estadosReparacion: { valor: EstadoReparacion; label: string }[] = [
    { valor: 'SI', label: 'Reparado' },
    { valor: 'NO', label: 'No reparado' },
    { valor: 'PENDIENTE', label: 'Pendiente' },
  ];

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const orden = this.orden();
      untracked(() => {
        this.ticketEquipo.set(ticketEquipoDesdeOrden(orden));
        this.ticketVehiculo.set(ticketVehiculoDesdeOrden(orden));
      });
    });
  }

  protected set(campo: CampoBase, valor: string): void {
    this.actualizarBase({ [campo]: valor ?? '' });
  }

  protected setNumero(campo: 'pagoRevision' | 'recargoUrgente', valor: number | null): void {
    const numero = valor == null || Number.isNaN(Number(valor)) ? null : Number(valor);
    this.actualizarBase({ [campo]: numero });
  }

  protected montoTexto(valor: number | null): string {
    return valor != null && valor > 0 ? formatGs(valor) : '';
  }

  /** Acepta el monto con o sin puntos de miles y lo deja formateado mientras se escribe. */
  protected setMonto(campo: 'pagoRevision', event: Event): void {
    const el = event.target as HTMLInputElement;
    const digitos = el.value.replace(/\D/g, '');
    const numero = digitos ? Number(digitos) : null;
    el.value = this.montoTexto(numero);
    this.actualizarBase({ [campo]: numero });
  }

  protected setEquipo(campo: CampoEquipo, valor: string): void {
    this.ticketEquipo.update((t) => ({ ...t, [campo]: valor ?? '' }));
  }

  protected setItem(lista: 'componentes' | 'servicios', index: number, valor: string): void {
    this.ticketEquipo.update((t) => ({
      ...t,
      [lista]: t[lista].map((c, i) => (i === index ? { ...c, valor: valor ?? '' } : c)),
    }));
  }

  protected setVehiculo(campo: CampoVehiculo, valor: string): void {
    this.ticketVehiculo.update((t) => ({ ...t, [campo]: valor ?? '' }));
  }

  protected setReparado(index: number, reparado: EstadoReparacion): void {
    this.ticketVehiculo.update((t) => ({
      ...t,
      condiciones: t.condiciones.map((c, i) => (i === index ? { ...c, reparado } : c)),
    }));
  }

  protected setServicio(index: number, valor: string): void {
    this.ticketVehiculo.update((t) => ({
      ...t,
      servicios: t.servicios.map((s, i) => (i === index ? valor ?? '' : s)),
    }));
  }

  protected agregarServicio(): void {
    this.ticketVehiculo.update((t) => ({ ...t, servicios: [...t.servicios, ''] }));
  }

  protected quitarServicio(index: number): void {
    this.ticketVehiculo.update((t) => ({ ...t, servicios: t.servicios.filter((_, i) => i !== index) }));
  }

  protected imprimir(): void {
    guardarCondiciones(this.ticket());
    this.imprimiendo.set(true);
    const envio = this.tipo() === 'EQUIPO'
      ? this.impresion.imprimirTicketOrdenTrabajo(this.ticketEquipo())
      : this.impresion.imprimirTicketOrdenTrabajoVehiculo(this.ticketVehiculo());
    envio.subscribe({
      next: () => this.imprimiendo.set(false),
      error: () => this.imprimiendo.set(false),
    });
  }

  private actualizarBase(cambio: Partial<TicketOrdenTrabajoBase>): void {
    if (this.tipo() === 'EQUIPO') {
      this.ticketEquipo.update((t) => ({ ...t, ...cambio }));
    } else {
      this.ticketVehiculo.update((t) => ({ ...t, ...cambio }));
    }
  }
}

function ticketBaseDesdeOrden(orden: OrdenTrabajoOutput): TicketOrdenTrabajoBase {
  const persona = orden.cliente?.persona;
  const vehiculo = orden.vehiculo ?? orden.equipo?.vehiculo;
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
    vehiculo: [vehiculo?.marca, vehiculo?.modelo, vehiculo?.anio].filter(Boolean).join(' '),
    descripcionProblema: orden.recepcion?.descripcion_falla ?? '',
    pagoRevision: condiciones.pagoRevision,
    recargoUrgente: condiciones.recargoUrgente,
  };
}

/** Marca con SI el componente que coincide con el tipo del equipo recepcionado. */
function ticketEquipoDesdeOrden(orden: OrdenTrabajoOutput): TicketOrdenTrabajo {
  const vehiculo = orden.vehiculo ?? orden.equipo?.vehiculo;
  const tipoEquipo = normalizar(orden.equipo?.tipo_equipo);
  const componentes = COMPONENTES.map((etiqueta): TicketCampo => ({
    etiqueta,
    valor: tipoEquipo && normalizar(etiqueta) === tipoEquipo ? 'SI' : '',
  }));
  if (tipoEquipo && !componentes.some((c) => c.valor === 'SI')) {
    componentes.push({ etiqueta: orden.equipo!.tipo_equipo!.trim(), valor: 'SI' });
  }
  return {
    ...ticketBaseDesdeOrden(orden),
    codigoUnidad: vehiculo?.chapa ?? '',
    vin: '',
    componentes,
    servicios: SERVICIOS.map((etiqueta): TicketCampo => ({ etiqueta, valor: '' })),
  };
}

function ticketVehiculoDesdeOrden(orden: OrdenTrabajoOutput): TicketOrdenTrabajoVehiculo {
  const estado = orden.estado_vehiculo;
  const terminada = orden.etapa === 'FINALIZADA' || orden.etapa === 'FACTURADO';
  const km = estado?.kilometraje;
  return {
    ...ticketBaseDesdeOrden(orden),
    chapa: orden.vehiculo?.chapa ?? '',
    kilometraje: km != null ? `${formatGs(km)} km` : '',
    combustible: COMBUSTIBLE[estado?.nivel_combustible ?? ''] ?? '',
    tipoFalla: tipoFallaDesdeOrden(orden),
    condiciones: CONDICIONES_VEHICULO
      .filter((c) => !!estado?.[c.campo])
      .map((c): TicketCondicionVehiculo => ({ etiqueta: c.etiqueta, reparado: terminada ? 'SI' : 'PENDIENTE' })),
    observacionesEstado: estado?.observaciones_estado ?? '',
    servicios: (orden.detalles ?? [])
      .filter((d) => d.tipo === 'SERVICIO')
      .map((d) => (d.nombre_servicio || d.descripcion || '').trim())
      .filter(Boolean),
  };
}

/** Tipos marcados en la recepción más los sistemas de los hallazgos del diagnóstico, sin repetir. */
function tipoFallaDesdeOrden(orden: OrdenTrabajoOutput): string {
  const estado = orden.estado_vehiculo;
  const tipos: string[] = [];
  if (estado?.falla_mecanica) tipos.push('Mecánica');
  if (estado?.falla_electrica) tipos.push('Eléctrica');
  for (const h of orden.hallazgos ?? []) {
    if (!h.sistema || (h.sistema === 'ELECTRICO' && estado?.falla_electrica)) continue;
    const label = labelSistemaHallazgo(h.sistema);
    if (!tipos.includes(label)) tipos.push(label);
  }
  return tipos.length > 1
    ? `${tipos.slice(0, -1).join(', ')} y ${tipos[tipos.length - 1]}`
    : (tipos[0] ?? '');
}

function normalizar(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function leerCondiciones(): Pick<TicketOrdenTrabajoBase, 'pagoRevision' | 'recargoUrgente'> {
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

function guardarCondiciones(ticket: TicketOrdenTrabajoBase): void {
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
