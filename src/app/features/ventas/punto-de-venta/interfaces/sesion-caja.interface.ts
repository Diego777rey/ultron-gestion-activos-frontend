import { CajaOutput } from '../../../financiero/cajas/interfaces/caja.interface';
import { MaletinOutput } from '../../../financiero/maletines/interfaces/maletin.interface';

export interface ConteoDenominacionInput {
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
  estado: string;
  montoInicialPyg?: number;
  montoInicialUsd?: number;
  montoInicialBrl?: number;
  montoFinalPyg?: number;
  montoFinalUsd?: number;
  montoFinalBrl?: number;
  diferenciaPyg?: number;
  diferenciaUsd?: number;
  diferenciaBrl?: number;
  totalVentasPyg?: number;
  fechaApertura?: string;
  fechaCierre?: string;
}
