export interface TimbradoOutput {
  id_timbrado: number;
  numero_timbrado: string;
  establecimiento: string;
  punto_expedicion: string;
  numero_inicial: number;
  numero_final: number;
  numero_actual: number;
  fecha_inicio_vigencia: string;
  fecha_fin_vigencia: string;
  id_empresa: number;
  tipo_factura: string;
  activo: boolean;
  fecha_creacion?: string;
  numeros_disponibles?: number;
  esta_vigente?: boolean;
  dias_hasta_vencimiento?: number;
}

export interface TimbradoInput {
  numeroTimbrado: string;
  establecimiento: string;
  puntoExpedicion: string;
  numeroInicial: number;
  numeroFinal: number;
  numeroActual?: number | null;
  fechaInicioVigencia: string;
  fechaFinVigencia: string;
  idEmpresa: number;
  tipoFactura: 'PAPEL';
  activo: boolean;
}
