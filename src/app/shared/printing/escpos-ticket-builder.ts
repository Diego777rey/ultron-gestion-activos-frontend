import {
  EstadoReparacion,
  TicketArqueoMoneda,
  TicketCierreCaja,
  TicketConteoMoneda,
  TicketFactura,
  TicketOrdenTrabajo,
  TicketOrdenTrabajoBase,
  TicketOrdenTrabajoVehiculo,
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
  if (ticket.montoRecibido != null) {
    imprimirImporteConMoneda(builder, 'Recibido', ticket.montoRecibido, ticket.monedaRecibida, ticket.montoRecibidoPyg);
    const vueltoPyg = ticket.vueltoPyg ?? Math.max((ticket.montoRecibidoPyg ?? ticket.montoRecibido) - ticket.total, 0);
    imprimirImporteConMoneda(builder, 'Vuelto', ticket.vuelto ?? vueltoPyg, ticket.monedaVuelto, vueltoPyg);
  }
  builder.separator();
  builder.align(1);
  builder.line(blankTo(ticket.pie, 'Gracias por su compra'));
  builder.feed(3);
  builder.cut();
  return builder.toBytes();
}

/**
 * Factura autoimpresa (papel) para térmica de 58 mm.
 * Lleva los datos que exige la SET: emisor, timbrado, número, comprador,
 * discriminación de IVA y liquidación.
 */
export function buildTicketFactura(ticket: TicketFactura): Uint8Array {
  const ancho = WIDTH_58MM_FONT_B;
  const builder = new EscPosTicketBuilder().init().align(1).logo().feed(1).smallFont(LINE_SPACING_FONT_B);
  const centrado = (texto: string) => escribir(builder, texto, ancho, true, false);
  const campo = (texto: string, conservarEspacios = false) =>
    escribir(builder, texto, ancho, false, conservarEspacios);
  const regla = () => builder.align(0).line('-'.repeat(ancho));

  centrado(blankTo(ticket.razonSocial, 'SIN RAZON SOCIAL'));
  if (notBlank(ticket.nombreFantasia)) {
    centrado(ticket.nombreFantasia!.trim());
  }
  campo(`RUC: ${blankTo(ticket.ruc, '-')}`);
  campo(`DIRECCION: ${blankTo(ticket.direccion, '-')}`);
  campo(`TEL: ${blankTo(ticket.telefono, '-')}`);
  campo(`ACTIVIDAD: ${blankTo(ticket.actividadEconomica, '-')}`);
  regla();
  campo(`TIMBRADO NRO: ${blankTo(ticket.timbrado, '-')}`);
  campo(`INICIO VIGENCIA: ${blankTo(ticket.vigenciaInicio, '-')}`);
  campo(`FIN VIGENCIA: ${blankTo(ticket.vigenciaFin, '-')}`);
  builder.align(1).bold(true).line('FACTURA');
  builder.bold(false);
  centrado(blankTo(ticket.numeroFactura, '-'));
  campo(`FECHA: ${blankTo(ticket.fecha, formatNow())}`);
  campo(`CONDICION: ${blankTo(ticket.condicion, 'CONTADO')}`);
  if (notBlank(ticket.formaPago)) {
    campo(`FORMA DE PAGO: ${ticket.formaPago!.trim()}`);
  }
  regla();
  campo(`CLIENTE: ${blankTo(ticket.clienteNombre, 'SIN NOMBRE')}`);
  campo(`RUC/CI: ${blankTo(ticket.clienteDocumento, '-')}`);
  campo(`DIRECCION: ${blankTo(ticket.clienteDireccion, '-')}`);
  regla();
  campo('CANT  DESCRIPCION   P.UNIT');
  campo(encabezadoIva(ancho), true);
  regla();

  for (const linea of ticket.lineas ?? []) {
    const cantidad = formatCantidad(linea.cantidad);
    const precio = formatGs(linea.precioUnitario);
    campo(`${cantidad} x ${precio}`);
    campo(blankTo(linea.descripcion, 'ITEM'));
    campo(
      columnasIva(ancho, montoEnColumna(linea, 'EXENTA'), montoEnColumna(linea, '5'), montoEnColumna(linea, '10')),
      true,
    );
  }

  regla();
  campo(filaTotal(ancho, 'TOTAL EXENTAS', ticket.totalExenta), true);
  campo(filaTotal(ancho, 'TOTAL GRAV. 5%', ticket.totalGravada5), true);
  campo(filaTotal(ancho, 'TOTAL GRAV. 10%', ticket.totalGravada10), true);
  builder.bold(true);
  campo(filaTotal(ancho, 'TOTAL A PAGAR Gs.', ticket.total), true);
  builder.bold(false);
  regla();
  centrado('LIQUIDACION DEL IVA');
  campo(filaTotal(ancho, 'IVA 5%', ticket.totalIva5), true);
  campo(filaTotal(ancho, 'IVA 10%', ticket.totalIva10), true);
  campo(filaTotal(ancho, 'TOTAL IVA', (ticket.totalIva5 ?? 0) + (ticket.totalIva10 ?? 0)), true);
  regla();
  centrado('ORIGINAL: CLIENTE');
  centrado('IVA INCLUIDO');
  builder.feed(3).cut();
  return builder.toBytes();
}

const NOMBRE_MONEDA: Record<string, string> = {
  PYG: 'GUARANIES',
  BRL: 'REALES',
  USD: 'DOLARES',
};

const ETIQUETA_FORMA_PAGO: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
};

/** Ticket de cierre de caja: conteos, ventas, retiros, arqueo, diferencia con el cierre anterior y firmas. */
export function buildTicketCierreCaja(ticket: TicketCierreCaja): Uint8Array {
  const ancho = WIDTH_58MM_FONT_B;
  const builder = new EscPosTicketBuilder().init().align(1).logo().feed(1).smallFont(LINE_SPACING_FONT_B);
  const titulo = (texto: string) => builder.align(1).bold(true).line(texto).bold(false);
  const regla = () => builder.align(0).line('-'.repeat(ancho));
  const fila = (izquierda: string, derecha: string, negrita = false) =>
    builder.align(0).bold(negrita).line(filaTexto(ancho, izquierda, derecha)).bold(false);

  const conteo = (encabezado: string, monedas: TicketConteoMoneda[]) => {
    titulo(encabezado);
    for (const m of monedas) {
      const nombre = NOMBRE_MONEDA[m.moneda] ?? m.moneda;
      const simbolo = simboloTicket(m.moneda);
      if (!m.lineas.length) {
        fila(nombre, `${simbolo} ${montoTicket(m.moneda, m.total)}`);
        continue;
      }
      builder.align(0).bold(true).line(nombre).bold(false);
      for (const l of m.lineas) {
        fila(`  ${simbolo} ${formatGs(l.valor)} x ${l.cantidad}`, montoTicket(m.moneda, l.subtotal));
      }
      fila(`  Total ${simbolo}`, montoTicket(m.moneda, m.total), true);
    }
  };

  titulo('CIERRE DE CAJA');
  builder.align(1).line(`Sesion #${ticket.idSesionCaja}`);
  regla();
  fila('Caja', blankTo(ticket.caja, '-'));
  fila('Maletin', blankTo(ticket.maletin, '-'));
  fila('Cajero', blankTo(ticket.cajero, '-'));
  fila('Apertura', blankTo(ticket.fechaApertura, '-'));
  fila('Cierre', blankTo(ticket.fechaCierre, '-'));
  regla();
  conteo('CONTEO DE APERTURA', ticket.conteoApertura ?? []);
  regla();
  conteo('CONTEO DE CIERRE', ticket.conteoCierre ?? []);
  regla();

  titulo('VENTAS');
  const ventas = ticket.ventasPorFormaPago ?? [];
  if (!ventas.length) {
    builder.align(1).line('Sin ventas');
  }
  for (const v of ventas) {
    fila(`${ETIQUETA_FORMA_PAGO[v.formaPago] ?? v.formaPago} (${v.cantidad})`, formatGs(v.total));
  }
  fila(`TOTAL VENTAS Gs. (${ticket.cantidadVentas ?? 0})`, formatGs(ticket.totalVentasPyg), true);
  regla();

  titulo('RETIROS');
  const retiros = ticket.retiros ?? [];
  if (!retiros.length) {
    builder.align(1).line('Sin retiros');
  }
  for (const r of retiros) {
    fila(blankTo(r.fecha, '-'), `${simboloTicket(r.moneda)} ${montoTicket(r.moneda, r.monto)}`, true);
    fila('  Resp.', blankTo(r.responsable, '-'));
    if (notBlank(r.observacion)) {
      for (const renglon of envolver([{ texto: r.observacion!.trim() }], ancho - 2)) {
        builder.align(0).segments([{ texto: '  ' }, ...renglon]);
      }
    }
  }
  regla();

  titulo('ARQUEO DE CAJA');
  for (const a of (ticket.arqueo ?? []).filter(conMovimiento)) {
    const s = simboloTicket(a.moneda);
    builder.align(0).bold(true).line(NOMBRE_MONEDA[a.moneda] ?? a.moneda).bold(false);
    fila('  Apertura', `${s} ${montoTicket(a.moneda, a.apertura)}`);
    fila('  + Cobros en efectivo', montoTicket(a.moneda, a.cobrosEfectivo));
    fila('  - Vueltos', montoTicket(a.moneda, a.vueltos));
    fila('  - Retiros', montoTicket(a.moneda, a.retiros));
    fila('  = Esperado', `${s} ${montoTicket(a.moneda, a.esperado)}`, true);
    if (a.contado != null) {
      fila('  Contado', `${s} ${montoTicket(a.moneda, a.contado)}`);
      fila(`  ${etiquetaDiferenciaArqueo(a.diferencia)}`, conSigno(a.moneda, a.diferencia), true);
    }
  }
  regla();

  titulo('DIFERENCIA DE APERTURA');
  if (ticket.idSesionAnterior == null) {
    builder.align(1).line('Sin cierre anterior del maletin');
  } else {
    builder.align(1).line(`Contra cierre sesion #${ticket.idSesionAnterior}`);
    if (notBlank(ticket.fechaCierreAnterior)) {
      builder.line(ticket.fechaCierreAnterior!.trim());
    }
    for (const d of ticket.diferencias ?? []) {
      builder.align(0).bold(true).line(NOMBRE_MONEDA[d.moneda] ?? d.moneda).bold(false);
      fila('  Cierre anterior', montoTicket(d.moneda, d.cierreAnterior ?? 0));
      fila('  Apertura', montoTicket(d.moneda, d.apertura));
      fila('  Diferencia', conSigno(d.moneda, d.diferencia), true);
    }
  }
  regla();

  builder.feed(4);
  builder.align(1).line('_'.repeat(30));
  titulo('FIRMA DEL CAJERO');
  if (notBlank(ticket.cajero)) {
    builder.line(ticket.cajero!.trim());
  }
  builder.feed(4);
  builder.align(1).line('_'.repeat(30));
  titulo('FIRMA DE CONTROL');
  builder.feed(3).cut();
  return builder.toBytes();
}

/** Guaraníes siempre; las otras monedas solo si tuvieron efectivo en la sesión. */
function conMovimiento(a: TicketArqueoMoneda): boolean {
  return (
    a.moneda === 'PYG' ||
    [a.apertura, a.cobrosEfectivo, a.vueltos, a.retiros, a.contado].some((v) => !!v && Number(v) !== 0)
  );
}

function etiquetaDiferenciaArqueo(diferencia: number | null | undefined): string {
  if (!diferencia) return 'SIN DIFERENCIA';
  return diferencia < 0 ? 'FALTANTE' : 'SOBRANTE';
}

/** Ticket de recepción de equipos. */
export function buildTicketOrdenTrabajo(ticket: TicketOrdenTrabajo): Uint8Array {
  return buildDesdeRenglones(layoutTicketOrdenTrabajo(ticket));
}

/** Ticket de recepción de vehículos. */
export function buildTicketOrdenTrabajoVehiculo(ticket: TicketOrdenTrabajoVehiculo): Uint8Array {
  return buildDesdeRenglones(layoutTicketOrdenTrabajoVehiculo(ticket));
}

function buildDesdeRenglones(renglones: TicketRenglon[]): Uint8Array {
  const builder = new EscPosTicketBuilder().init().smallFont(LINE_SPACING_FONT_B);
  for (const renglon of renglones) {
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
  const t = new LayoutOrdenTrabajo();
  t.encabezado(ticket);
  t.campo('Cod. unidad', ticket.codigoUnidad);
  t.campo('Vehiculo', ticket.vehiculo);
  t.campo('VIN', ticket.vin);
  t.vacio();
  for (const c of ticket.componentes ?? []) t.campo(c.etiqueta, c.valor);
  t.vacio();
  t.titulo('SERVICIOS');
  for (const s of ticket.servicios ?? []) t.campo(s.etiqueta, s.valor);
  const cargados = (ticket.serviciosOrden ?? []).map((s) => s.trim()).filter(notBlank);
  if (cargados.length) {
    t.vacio();
    for (const s of cargados) t.linea(`- ${s}`);
  }
  t.vacio();
  t.descripcionProblema(ticket);
  t.cierre(ticket);
  return t.renglones;
}

const TEXTO_REPARACION: Record<EstadoReparacion, string> = {
  SI: 'REPARADO',
  NO: 'NO REPARADO',
  PENDIENTE: 'PENDIENTE',
};

export function layoutTicketOrdenTrabajoVehiculo(ticket: TicketOrdenTrabajoVehiculo): TicketRenglon[] {
  const t = new LayoutOrdenTrabajo();
  t.encabezado(ticket, 'RECEPCION DE VEHICULO');
  t.campo('Chapa', ticket.chapa);
  t.campo('Vehiculo', ticket.vehiculo);
  if (notBlank(ticket.kilometraje)) t.campo('Kilometraje', ticket.kilometraje);
  if (notBlank(ticket.combustible)) t.campo('Combustible', ticket.combustible);
  t.vacio();
  t.titulo('TIPO DE FALLA');
  t.centrado(blankTo(ticket.tipoFalla, 'NO ESPECIFICADA'));
  t.vacio();
  t.titulo('ESTADO AL INGRESO');
  const condiciones = ticket.condiciones ?? [];
  if (condiciones.length === 0) t.centrado('SIN DAÑOS OBSERVADOS');
  for (const c of condiciones) t.campo(c.etiqueta, TEXTO_REPARACION[c.reparado] ?? c.reparado);
  if (notBlank(ticket.observacionesEstado)) t.campo('Obs.', ticket.observacionesEstado);
  t.vacio();
  t.descripcionProblema(ticket);
  t.vacio();
  t.titulo('SERVICIOS REALIZADOS');
  const servicios = (ticket.servicios ?? []).filter(notBlank);
  if (servicios.length === 0) t.centrado('SIN SERVICIOS CARGADOS');
  for (const s of servicios) t.linea(`- ${s.trim()}`);
  t.cierre(ticket);
  return t.renglones;
}

/** Piezas compartidas por los tickets de orden de trabajo: encabezado, garantía y firma. */
class LayoutOrdenTrabajo {
  readonly renglones: TicketRenglon[] = [{ logo: true }];

  agregar(centrado: boolean, segmentos: TicketSegmento[]): void {
    for (const linea of envolver(segmentos, WIDTH_58MM_FONT_B)) {
      this.renglones.push({ centrado, segmentos: linea });
    }
  }

  vacio(): void {
    this.renglones.push({ centrado: false, segmentos: [] });
  }

  regla(): void {
    this.renglones.push({ centrado: false, segmentos: [{ texto: '-'.repeat(WIDTH_58MM_FONT_B) }] });
  }

  titulo(texto: string): void {
    this.agregar(true, [{ texto, negrita: true }]);
  }

  centrado(texto: string): void {
    this.agregar(true, [{ texto: texto.toUpperCase() }]);
  }

  linea(texto: string): void {
    this.agregar(false, [{ texto: texto.toUpperCase() }]);
  }

  campo(etiqueta: string, valor: string | null | undefined): void {
    const v = (valor ?? '').trim();
    this.agregar(false, [
      { texto: `${etiqueta.trim().toUpperCase()}:`, negrita: true },
      ...(v ? [{ texto: ` ${v.toUpperCase()}` }] : []),
    ]);
  }

  /** Empresa, número, fecha y cliente; termina listo para los datos de la unidad. */
  encabezado(ticket: TicketOrdenTrabajoBase, subtitulo?: string): void {
    this.vacio();
    this.titulo(blankTo(ticket.empresa, 'CH SERVICE').toUpperCase());
    if (notBlank(ticket.direccion)) this.centrado(ticket.direccion);
    if (notBlank(ticket.telefono)) this.agregar(true, [{ texto: `CEL. ${ticket.telefono.trim()}` }]);
    this.regla();
    this.titulo('ORDEN DE TRABAJO');
    if (subtitulo) this.centrado(subtitulo);
    if (notBlank(ticket.numero)) this.agregar(true, [{ texto: ticket.numero!.trim() }]);
    this.vacio();
    this.campo('Fecha', ticket.fecha);
    this.campo('Hora', ticket.hora);
    this.vacio();
    this.campo('Cliente', ticket.cliente);
    this.campo('Cel', ticket.celular);
    this.campo('RUC', ticket.ruc);
  }

  descripcionProblema(ticket: TicketOrdenTrabajoBase): void {
    this.titulo('DESCRIPCION DEL PROBLEMA');
    this.agregar(true, [{ texto: (ticket.descripcionProblema ?? '').toUpperCase() }]);
  }

  /** Condiciones y garantía: el texto es el mismo en todos los tickets de orden de trabajo. */
  cierre(ticket: TicketOrdenTrabajoBase): void {
    this.regla();
    for (const parrafo of condicionesOrdenTrabajo(ticket)) {
      this.agregar(false, parrafo.map((s) => ({ ...s, texto: s.texto.toUpperCase() })));
    }
    this.vacio();
    this.vacio();
    this.vacio();
    this.agregar(true, [{ texto: '_'.repeat(26) }]);
    this.titulo('FIRMA DEL CLIENTE');
  }
}

function condicionesOrdenTrabajo(ticket: TicketOrdenTrabajoBase): TicketSegmento[][] {
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

/** Importe en moneda extranjera con dos decimales y coma decimal: 1234.5 → "1.234,50". */
export function formatMonedaExtranjera(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '0,00';
  }
  const centavos = Math.round(Math.abs(value) * 100);
  const entero = formatGs(Math.floor(centavos / 100));
  const decimales = String(centavos % 100).padStart(2, '0');
  return `${value < 0 ? '-' : ''}${entero},${decimales}`;
}

const SIMBOLOS_TICKET: Record<string, string> = {
  PYG: 'Gs.',
  GS: 'Gs.',
  GUARANI: 'Gs.',
  GUARANIES: 'Gs.',
  USD: 'US$',
  DOLAR: 'US$',
  DOLARES: 'US$',
  BRL: 'R$',
  REAL: 'R$',
  REALES: 'R$',
  ARS: '$',
  PESO: '$',
  EUR: 'EUR',
  EURO: 'EUR',
};

function esGuaraniTicket(moneda: string | null | undefined): boolean {
  const clave = sanitize(moneda).trim().toUpperCase();
  return !clave || SIMBOLOS_TICKET[clave] === 'Gs.';
}

function simboloTicket(moneda: string | null | undefined): string {
  const clave = sanitize(moneda).trim().toUpperCase();
  return SIMBOLOS_TICKET[clave] ?? clave;
}

/** Guaraníes sin decimales; las otras monedas con dos decimales. */
function montoTicket(moneda: string | null | undefined, value: number | null | undefined): string {
  return esGuaraniTicket(moneda) ? formatGs(value) : formatMonedaExtranjera(value);
}

function conSigno(moneda: string | null | undefined, value: number | null | undefined): string {
  const monto = montoTicket(moneda, value);
  return value != null && value > 0 && monto !== montoTicket(moneda, 0) ? `+${monto}` : monto;
}

/**
 * "Recibido Gs.      600.000" en guaraníes; en otra moneda imprime el importe
 * original y, debajo, su equivalente en guaraníes para que el ticket cierre.
 */
function imprimirImporteConMoneda(
  builder: EscPosTicketBuilder,
  etiqueta: string,
  importe: number,
  moneda: string | null | undefined,
  equivalentePyg: number | null | undefined,
): void {
  if (esGuaraniTicket(moneda)) {
    builder.columns(`${etiqueta} Gs.`, formatGs(importe));
    return;
  }
  builder.columns(`${etiqueta} ${simboloTicket(moneda)}`, formatMonedaExtranjera(importe));
  if (equivalentePyg != null) {
    builder.columns('  equiv. Gs.', formatGs(equivalentePyg));
  }
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

function escribir(
  builder: EscPosTicketBuilder,
  texto: string,
  ancho: number,
  centrado: boolean,
  conservarEspacios: boolean,
): void {
  const base = sanitize(texto);
  const limpio = conservarEspacios ? base : base.trim();
  const contenido = limpio.length > 0 ? limpio : '-';
  builder.align(centrado ? 1 : 0);
  for (let i = 0; i < contenido.length; i += ancho) {
    builder.line(contenido.slice(i, i + ancho));
  }
}

function encabezadoIva(ancho: number): string {
  return alinearMontos(ancho, 'EXENTAS', '5%', '10%');
}

function columnasIva(ancho: number, exenta: number, iva5: number, iva10: number): string {
  return alinearMontos(ancho, formatGs(exenta), formatGs(iva5), formatGs(iva10));
}

function alinearMontos(ancho: number, exenta: string, iva5: string, iva10: string): string {
  const columna = 12;
  const texto = exenta.padStart(columna) + iva5.padStart(columna) + iva10.padStart(columna);
  return texto.length >= ancho ? texto.slice(texto.length - ancho) : texto.padStart(ancho);
}

function montoEnColumna(linea: { subtotal: number; tipoIva: string }, tipo: string): number {
  return (linea.tipoIva ?? '10').toUpperCase() === tipo ? linea.subtotal : 0;
}

function filaTotal(ancho: number, etiqueta: string, monto: number): string {
  return filaTexto(ancho, etiqueta, formatGs(monto));
}

/** Etiqueta a la izquierda y valor a la derecha en `ancho` columnas. */
function filaTexto(ancho: number, etiqueta: string, derecha: string): string {
  const valor = sanitize(derecha);
  const limpio = sanitize(etiqueta);
  if (limpio.length + 1 + valor.length > ancho) {
    return `${limpio.slice(0, Math.max(0, ancho - valor.length - 1))} ${valor}`.slice(0, ancho);
  }
  return limpio + ' '.repeat(ancho - limpio.length - valor.length) + valor;
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
