import { CajaOutput, PersonaResumen } from '../../../financiero/cajas/interfaces/caja.interface';
import { MaletinOutput } from '../../../financiero/maletines/interfaces/maletin.interface';
import { TicketArqueoMoneda } from '../../../../shared/models/impresion.model';

export interface ConteoDenominacionInput {
  moneda: string;
  valorDenominacion: number;
  cantidad: number;
}

export interface ConteoDenominacionOutput {
  id_conteo?: number;
  tipo: string;
  moneda: string;
  valorDenominacion: number;
  cantidad: number;
}

export interface AbrirCajaInput {
  idCaja: number;
  idMaletin: number;
  idPersona?: number | null;
  conteos: ConteoDenominacionInput[];
}

export interface CerrarCajaInput {
  idSesionCaja: number;
  conteos: ConteoDenominacionInput[];
}

export interface SesionCajaOutput {
  id_sesion_caja: number;
  caja?: CajaOutput | null;
  maletin?: MaletinOutput | null;
  persona?: PersonaResumen | null;
  estado: string;
  montoInicialPyg?: number;
  montoInicialUsd?: number;
  montoInicialBrl?: number;
  montoFinalPyg?: number;
  montoFinalUsd?: number;
  montoFinalBrl?: number;
  /** Apertura menos el último cierre del mismo maletín. */
  diferenciaPyg?: number;
  diferenciaUsd?: number;
  diferenciaBrl?: number;
  /** Efectivo que debía haber al cerrar (apertura + cobros en efectivo − vueltos − retiros). */
  esperadoCierrePyg?: number | null;
  esperadoCierreUsd?: number | null;
  esperadoCierreBrl?: number | null;
  /** Contado al cierre menos esperado: negativo es faltante. */
  diferenciaArqueoPyg?: number | null;
  diferenciaArqueoUsd?: number | null;
  diferenciaArqueoBrl?: number | null;
  totalVentasPyg?: number;
  fechaApertura?: string;
  fechaCierre?: string;
  conteos?: ConteoDenominacionOutput[] | null;
  /** Cierre con el que se comparó la apertura; null si el maletín no tenía cierres. */
  idSesionAnterior?: number | null;
  fechaCierreAnterior?: string | null;
  montoCierreAnteriorPyg?: number | null;
  montoCierreAnteriorUsd?: number | null;
  montoCierreAnteriorBrl?: number | null;
}

/** Arqueo de una moneda; `contado` y `diferencia` llegan solo con la sesión cerrada. */
export type ArqueoMoneda = TicketArqueoMoneda;

export interface RetiroCajaInput {
  idSesionCaja: number;
  moneda: string;
  monto: number;
  observacion: string;
  idUsuarioResponsable: number;
}

export interface RetiroCajaOutput {
  id_retiro_caja: number;
  idSesionCaja: number;
  moneda: string;
  monto: number;
  observacion: string;
  fecha: string;
  idUsuarioResponsable: number;
  responsableUsuario: string | null;
  responsableNombre: string | null;
  registradoPor: string | null;
}
