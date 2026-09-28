import { TicketVenta } from '../models/impresion.model';
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
