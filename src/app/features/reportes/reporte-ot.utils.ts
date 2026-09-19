import {
  ETAPAS_ORDEN,
  OrdenDiagnosticoHallazgoOutput,
  OrdenTrabajoDetalleOutput,
  OrdenTrabajoOutput,
} from '../taller/orden-de-trabajo/interfaces/orden-trabajo.interface';

export function formatClienteOt(orden: OrdenTrabajoOutput): string {
  const p = orden.cliente?.persona;
  return p ? `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || '—' : '—';
}

export function formatDocumentoOt(orden: OrdenTrabajoOutput): string {
  return orden.cliente?.persona?.documento?.trim() || '—';
}

export function formatVehiculoOt(orden: OrdenTrabajoOutput): string {
  const v = orden.vehiculo;
  if (!v) return '—';
  const desc = `${v.marca ?? ''} ${v.modelo ?? ''}`.trim();
  return v.chapa ? `${desc} (${v.chapa})` : desc || '—';
}

export function formatPersonaOt(persona?: { nombre?: string | null; apellido?: string | null } | null): string {
  if (!persona) return '—';
  return `${persona.nombre ?? ''} ${persona.apellido ?? ''}`.trim() || '—';
}

export function mecanicosDeOrden(orden: OrdenTrabajoOutput): NonNullable<OrdenTrabajoOutput['mecanicos']> {
  if (orden.mecanicos?.length) {
    return orden.mecanicos;
  }
  return orden.mecanico ? [orden.mecanico] : [];
}

export function formatMecanicosOt(orden: OrdenTrabajoOutput): string {
  const names = mecanicosDeOrden(orden)
    .map((m) => formatPersonaOt(m.persona))
    .filter((n) => n !== '—');
  return names.length ? names.join(', ') : '—';
}

export function formatMecanicoLineaOt(detalle: OrdenTrabajoDetalleOutput): string {
  if (detalle.tipo !== 'SERVICIO') return '—';
  return formatPersonaOt(detalle.mecanico?.persona);
}

export function formatFechaOt(fecha?: string | null): string {
  if (!fecha) return '—';
  try {
    return new Intl.DateTimeFormat('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(fecha));
  } catch {
    return fecha;
  }
}

export function formatFechaHoraOt(fecha?: string | null): string {
  if (!fecha) return '—';
  try {
    return new Intl.DateTimeFormat('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(fecha));
  } catch {
    return fecha;
  }
}

export function formatMonedaOt(valor?: number | null): string {
  if (valor == null || Number.isNaN(valor)) {
    return '—';
  }
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function nombreLineaOt(detalle: OrdenTrabajoDetalleOutput): string {
  return (
    detalle.nombre_producto?.trim() ||
    detalle.nombre_servicio?.trim() ||
    detalle.descripcion?.trim() ||
    '—'
  );
}

export function condicionesVehiculoOt(orden: OrdenTrabajoOutput): string[] {
  const e = orden.estado_vehiculo;
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
}

export function hallazgoTextoOt(item: OrdenDiagnosticoHallazgoOutput): string {
  const prefijo = [item.tipo, item.gravedad, item.sistema].filter((p) => !!p?.trim()).join(' / ');
  const desc = item.descripcion?.trim() || '—';
  return prefijo ? `${prefijo} — ${desc}` : desc;
}

export function totalLineasOt(orden: OrdenTrabajoOutput): number {
  return (orden.detalles ?? []).reduce((acc, d) => acc + (d.subtotal ?? 0), 0);
}

export function etapaInfoOt(etapa?: string | null) {
  return (
    ETAPAS_ORDEN.find((e) => e.valor === etapa) ?? {
      label: etapa ?? '—',
      icono: 'help',
      color: '#9E9E9E',
    }
  );
}
