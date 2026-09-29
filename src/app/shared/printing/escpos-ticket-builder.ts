import {
  TicketOrdenTrabajo,
  TicketRenglon,
  TicketSegmento,
  TicketVenta,
} from '../models/impresion.model';
import {
  CHSERVICE_LOGO_HEIGHT,
  CHSERVICE_LOGO_WIDTH,
  chserviceLogoRaster,
} from './chservice-logo';

/**
 * Ticket térmico de 58 mm: 32 caracteres por línea, bytes ESC/POS.
 * Este builder es el que imprime el punto de venta. No dupliques el layout en el backend.
 */
const WIDTH_58MM = 32;
/** Columnas de la fuente chica (Font B, 9 puntos de ancho) en 58 mm. */
export const WIDTH_58MM_FONT_B = 42;
/** Interlineado en puntos para Font B: legible y ahorra papel. */
const LINE_SPACING_FONT_B = 22;
/** Ancho imprimible de una térmica de 58 mm a 203 dpi. */
const DOTS_58MM = 384;

export function buildPrueba(printerName: string): Uint8Array {
  return new EscPosTicketBuilder()
    .init()
    .align(1)
    .bold(true)
    .line('CH-SERVICE')
    .bold(false)
    .line('PRUEBA DE IMPRESION')
    .separator()
    .align(0)
    .line(`Impresora: ${printerName ?? ''}`)
    .line(`Fecha: ${formatNow()}`)
    .line('1234567890 ABCDEFGHIJK')
    .separator()
    .align(1)
    .line('Si lees esto, la impresora')
    .line('termica esta lista.')
    .feed(3)
    .cut()
    .toBytes();
}

export function buildTicketVenta(ticket: TicketVenta): Uint8Array {
  const builder = new EscPosTicketBuilder().init().align(1);
  builder.logo();
  builder.feed(1);
  if (notBlank(ticket.subtitulo)) {
    builder.line(ticket.subtitulo!.trim());
  }
  builder.line('TICKET DE VENTA');
  builder.separator();
  builder.align(0);
  if (notBlank(ticket.numero)) {
    builder.line(`Venta: ${ticket.numero!.trim()}`);
  }
  builder.line(`Fecha: ${blankTo(ticket.fecha, formatNow())}`);
  if (notBlank(ticket.cajero)) {
    builder.line(`Cajero: ${ticket.cajero!.trim()}`);
  }
  if (notBlank(ticket.cliente)) {
    builder.line(`Cliente: ${ticket.cliente!.trim()}`);
  }
  builder.separator();
  builder.line('Descripcion');
  builder.columns('Cant   P.U', 'Total');
  builder.separator();

  for (const linea of ticket.lineas ?? []) {
    builder.line(blankTo(linea.descripcion, 'Item'));
    const cantidad = formatCantidad(linea.cantidad);
    const precio = formatGs(linea.precioUnitario);
    const subtotal = formatGs(linea.subtotal ?? linea.cantidad * linea.precioUnitario);
    builder.columns(`${cantidad} x ${precio}`, subtotal);
  }

  builder.separator();
  if (ticket.descuento != null && ticket.descuento > 0) {
    builder.columns('Descuento', formatGs(ticket.descuento));
  }
  builder.bold(true);
  builder.columns('TOTAL Gs.', formatGs(ticket.total));
  builder.bold(false);
  builder.separator();
  builder.align(1);
  builder.line(blankTo(ticket.pie, 'Gracias por su compra'));
  builder.feed(3);
  builder.cut();
  return builder.toBytes();
}

export function buildTicketOrdenTrabajo(ticket: TicketOrdenTrabajo): Uint8Array {
  const builder = new EscPosTicketBuilder().init().smallFont(LINE_SPACING_FONT_B);
  for (const renglon of layoutTicketOrdenTrabajo(ticket)) {
    if ('logo' in renglon) {
      builder.align(1).logo();
      continue;
    }
    builder.align(renglon.centrado ? 1 : 0).segments(renglon.segmentos);
  }
  builder.feed(3);
  builder.cut();
  return builder.toBytes();
}

export function layoutTicketOrdenTrabajo(ticket: TicketOrdenTrabajo): TicketRenglon[] {
  const renglones: TicketRenglon[] = [{ logo: true }];
  const agregar = (centrado: boolean, segmentos: TicketSegmento[]) => {
    for (const linea of envolver(segmentos, WIDTH_58MM_FONT_B)) {
      renglones.push({ centrado, segmentos: linea });
    }
  };
  const vacio = () => renglones.push({ centrado: false, segmentos: [] });
  const titulo = (texto: string) => agregar(true, [{ texto, negrita: true }]);
  const campo = (etiqueta: string, valor: string | null | undefined) => {
    const v = (valor ?? '').trim();
    agregar(false, [
      { texto: `${etiqueta.trim().toUpperCase()}:`, negrita: true },
      ...(v ? [{ texto: ` ${v.toUpperCase()}` }] : []),
    ]);
  };

  vacio();
  titulo(blankTo(ticket.empresa, 'CH SERVICE').toUpperCase());
  if (notBlank(ticket.direccion)) agregar(true, [{ texto: ticket.direccion.toUpperCase() }]);
  if (notBlank(ticket.telefono)) agregar(true, [{ texto: `CEL. ${ticket.telefono.trim()}` }]);
  renglones.push({ centrado: false, segmentos: [{ texto: '-'.repeat(WIDTH_58MM_FONT_B) }] });
  titulo('ORDEN DE TRABAJO');
  if (notBlank(ticket.numero)) agregar(true, [{ texto: ticket.numero!.trim() }]);
  vacio();
  campo('Fecha', ticket.fecha);
  campo('Hora', ticket.hora);
  vacio();
  campo('Cliente', ticket.cliente);
  campo('Cel', ticket.celular);
  campo('RUC', ticket.ruc);
  campo('Cod. unidad', ticket.codigoUnidad);
  campo('Vehiculo', ticket.vehiculo);
  campo('VIN', ticket.vin);
  vacio();
  for (const c of ticket.componentes ?? []) campo(c.etiqueta, c.valor);
  vacio();
  titulo('SERVICIOS');
  for (const s of ticket.servicios ?? []) campo(s.etiqueta, s.valor);
  vacio();
  titulo('DESCRIPCION DEL PROBLEMA');
  agregar(true, [{ texto: (ticket.descripcionProblema ?? '').toUpperCase() }]);
  renglones.push({ centrado: false, segmentos: [{ texto: '-'.repeat(WIDTH_58MM_FONT_B) }] });
  for (const parrafo of condicionesOrdenTrabajo(ticket)) {
    agregar(false, parrafo.map((s) => ({ ...s, texto: s.texto.toUpperCase() })));
  }
  vacio();
  vacio();
  vacio();
  agregar(true, [{ texto: '_'.repeat(26) }]);
  titulo('FIRMA DEL CLIENTE');
  return renglones;
}

function condicionesOrdenTrabajo(ticket: TicketOrdenTrabajo): TicketSegmento[][] {
  const b = (texto: string): TicketSegmento => ({ texto, negrita: true });
  const t = (texto: string): TicketSegmento => ({ texto });
  const pago = ticket.pagoRevision != null && ticket.pagoRevision > 0
    ? `${formatGs(ticket.pagoRevision)} Gs.`
    : '__________ Gs.';
  const recargo = ticket.recargoUrgente ?? 0;
  return [
    [
      t('En caso de que el cliente '), b('no aceptara'),
      t(' la reparación del equipo por cualquier causa o el reclamo de garantía no fuera procedente,'
        + ' el cliente se compromete al '),
      b(`pago de revisión ${pago}`),
    ],
    [
      t('Todo trabajo urgente se realizará con un '), b(`costo extra de ${recargo}%`),
      t(' del costo normal a pagar.'),
    ],
    [
      t('El equipo amparado por la presente se recibe únicamente con lo especificado en accesorios. '),
      b('Para recoger'), t(' el equipo es necesario liquidar el '), b('costo del servicio'),
      t(' así como la '), b('presentación'), t(' de la '), b('orden de trabajo'),
      t(' de este documento. En caso de pérdida presentar cédula o tarjeta tributaria.'),
    ],
    [
      t('Todo equipo '), b('no reclamado a los 45 días'),
      t(' de reparado o recepcionado causará '), b('abandono'),
      t(' y no nos hacemos responsables por su equipo. Pasados los 60 días pasará a ser propiedad de la'
        + ' empresa, excepto que abone el costo por guardar el equipo de '),
      b('100.000 Gs. mensual'), t('.'),
    ],
    [
      t('La '), b('garantía'), t(' del servicio realizado es de '), b('5 días'),
      t(' en concepto de '), b('mano de obra'), t('. '), b('No brindamos garantías'),
      t(' por daño ocasionado por falla eléctrica, siniestros, mala práctica, humedad, entre otros'
        + ' producidos dentro del vehículo o externos.'),
    ],
    [
      t('El tiempo promedio de resultados es de '), b('24 a 48 hs'),
      t(' desde la recepción de la unidad, contando solo días hábiles '), b('lunes a viernes'),
      t('. No incluye feriados ni fines de semana.'),
    ],
  ];
}

/** Parte los segmentos en renglones de `ancho` columnas sin cortar palabras. */
export function envolver(segmentos: TicketSegmento[], ancho = WIDTH_58MM): TicketSegmento[][] {
  const palabras: TicketSegmento[][] = [];
  let palabra: TicketSegmento[] = [];
  for (const segmento of segmentos) {
    for (const parte of sanitize(segmento.texto).split(/(\s+)/)) {
      if (!parte) continue;
      if (/^\s+$/.test(parte)) {
        if (palabra.length) palabras.push(palabra);
        palabra = [];
        continue;
      }
      palabra.push({ texto: parte, negrita: !!segmento.negrita });
    }
  }
  if (palabra.length) palabras.push(palabra);

  const renglones: TicketSegmento[][] = [];
  let linea: TicketSegmento[] = [];
  let largo = 0;
  const cerrar = () => {
    renglones.push(unirSegmentos(linea));
    linea = [];
    largo = 0;
  };
  for (const p of palabras) {
    let piezas = p;
    let len = piezas.reduce((n, s) => n + s.texto.length, 0);
    if (largo > 0 && largo + 1 + len > ancho) cerrar();
    while (len > ancho) {
      const texto = piezas.map((s) => s.texto).join('');
      const negrita = piezas[0].negrita;
      renglones.push([{ texto: texto.slice(0, ancho), negrita }]);
      piezas = [{ texto: texto.slice(ancho), negrita }];
      len -= ancho;
    }
    if (largo > 0) {
      const negrita = !!linea[linea.length - 1].negrita && !!piezas[0].negrita;
      linea.push({ texto: ' ', negrita });
      largo++;
    }
    linea.push(...piezas);
    largo += len;
  }
  if (linea.length) cerrar();
  return renglones;
}

function unirSegmentos(segmentos: TicketSegmento[]): TicketSegmento[] {
  const unidos: TicketSegmento[] = [];
  for (const s of segmentos) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && !!ultimo.negrita === !!s.negrita) {
      ultimo.texto += s.texto;
    } else {
      unidos.push({ texto: s.texto, negrita: !!s.negrita });
    }
  }
  return unidos;
}

export function formatGs(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '0';
  }
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function sanitize(text: string | null | undefined): string {
  if (!text) {
    return '';
  }
  const normalized = text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replaceAll('ñ', 'n')
    .replaceAll('Ñ', 'N');
  return normalized.replace(/[^\x20-\x7E]/g, '?');
}

class EscPosTicketBuilder {
  private readonly bytes: number[] = [];

  init(): this {
    this.write([0x1b, 0x40]);
    this.write([0x1b, 0x74, 0x02]);
    return this;
  }

  align(n: number): this {
    this.write([0x1b, 0x61, n]);
    return this;
  }

  bold(on: boolean): this {
    this.write([0x1b, 0x45, on ? 1 : 0]);
    return this;
  }

  line(text: string): this {
    this.writeText(sanitize(text));
    this.write([0x0a]);
    return this;
  }

  smallFont(lineSpacingDots: number): this {
    this.write([0x1b, 0x4d, 0x01]);
    this.write([0x1b, 0x33, lineSpacingDots]);
    return this;
  }

  segments(segmentos: TicketSegmento[]): this {
    for (const s of segmentos) {
      this.bold(!!s.negrita);
      this.writeText(sanitize(s.texto));
    }
    this.bold(false);
    this.write([0x0a]);
    return this;
  }

  /** Imprime el logo de CH Service centrado en el ancho de 58 mm. */
  logo(): this {
    return this.rasterCentered(CHSERVICE_LOGO_WIDTH, CHSERVICE_LOGO_HEIGHT, chserviceLogoRaster());
  }

  separator(): this {
    return this.line('-'.repeat(WIDTH_58MM));
  }

  columns(left: string, right: string): this {
    let l = sanitize(left);
    let r = sanitize(right);
    if (r.length >= WIDTH_58MM) {
      return this.line(r.slice(r.length - WIDTH_58MM));
    }
    const remaining = WIDTH_58MM - r.length;
    if (l.length > remaining) {
      l = l.slice(0, remaining);
    }
    return this.line(l + ' '.repeat(remaining - l.length) + r);
  }

  feed(lines: number): this {
    this.write([0x1b, 0x64, Math.max(0, lines)]);
    return this;
  }

  cut(): this {
    this.write([0x1d, 0x56, 0x41, 0x10]);
    return this;
  }

  toBytes(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }

  private rasterCentered(widthDots: number, heightDots: number, rows: Uint8Array): this {
    const srcBytes = Math.ceil(widthDots / 8);
    const paperBytes = DOTS_58MM / 8;
    const left = Math.max(0, Math.floor((paperBytes - srcBytes) / 2));
    const outBytes = Math.max(paperBytes, srcBytes);
    this.write([
      0x1d, 0x76, 0x30, 0x00,
      outBytes & 0xff,
      (outBytes >> 8) & 0xff,
      heightDots & 0xff,
      (heightDots >> 8) & 0xff,
    ]);
    for (let y = 0; y < heightDots; y++) {
      const row = new Array<number>(outBytes).fill(0);
      const offset = y * srcBytes;
      for (let x = 0; x < srcBytes; x++) {
        row[left + x] = rows[offset + x];
      }
      this.write(row);
    }
    return this;
  }

  private writeText(text: string): void {
    for (let i = 0; i < text.length; i++) {
      this.bytes.push(text.charCodeAt(i) & 0xff);
    }
  }

  private write(bytes: number[]): void {
    this.bytes.push(...bytes);
  }
}

function formatNow(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatCantidad(cantidad: number | null | undefined): string {
  if (cantidad == null || !Number.isFinite(cantidad)) {
    return '1';
  }
  if (Number.isInteger(cantidad)) {
    return String(cantidad);
  }
  return String(cantidad);
}

function notBlank(value: string | null | undefined): boolean {
  return value != null && value.trim().length > 0;
}

function blankTo(value: string | null | undefined, fallback: string): string {
  return notBlank(value) ? value!.trim() : fallback;
}
