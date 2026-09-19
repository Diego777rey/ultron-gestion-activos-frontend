/** Cabecera UTF-8 (percent-encoded) con el título de negocio del PDF. */
export const REPORTE_TITULO_HEADER = 'X-Report-Title';

/** Ruta estable del visor in-app. Una sola pestaña reutilizable. */
export const REPORTE_VISOR_RUTA = '/reportes/visor';

/** Datos para abrir cualquier PDF en el visor, no solo los de /api/reportes. */
export interface AbrirReporteOpciones {
  titulo: string;
  filename: string;
  blob: Blob;
}

/** Sesión de un PDF ya generado, lista para mostrarse en el visor. */
export interface ReporteSesion {
  id: string;
  titulo: string;
  filename: string;
  objectUrl: string;
  creadoEn: Date;
}
