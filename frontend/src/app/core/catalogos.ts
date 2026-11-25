import { ColorIonic } from './matriz-estrategica';
import {
  ActividadEconomica,
  EstadoProcesamiento,
  EstadoRuta,
  NombreEntidad,
  OrigenRegistro,
  Provincia,
  Recomendacion,
  RolUsuario,
  TipoDataset,
  TipoEvento,
  TipoGestion,
} from './modelos';

export interface Opcion<T extends string> {
  valor: T;
  texto: string;
}

export const PROVINCIAS: Opcion<Provincia>[] = [
  { valor: 'Loja', texto: 'Loja' },
  { valor: 'Zamora Chinchipe', texto: 'Zamora Chinchipe' },
  { valor: 'El Oro', texto: 'El Oro' },
];

export const ACTIVIDADES: Opcion<ActividadEconomica>[] = [
  { valor: 'MICROEMPRESA', texto: 'Microempresa' },
  { valor: 'COMERCIO', texto: 'Comercio' },
  { valor: 'AGROPECUARIO', texto: 'Agropecuario' },
  { valor: 'SERVICIOS', texto: 'Servicios' },
];

export const ORIGENES: Opcion<OrigenRegistro>[] = [
  { valor: 'CAMPO', texto: 'Registro en campo' },
  { valor: 'CSV', texto: 'Carga CSV' },
];

export const GESTIONES: Opcion<TipoGestion>[] = [
  { valor: 'COBRANZA', texto: 'Cobranza' },
  { valor: 'NOVACION', texto: 'Novación' },
  { valor: 'PROMOCION', texto: 'Promoción' },
  { valor: 'BRIGADA', texto: 'Brigada' },
];

export const ESTADOS_RUTA: Opcion<EstadoRuta>[] = [
  { valor: 'PENDIENTE', texto: 'Pendiente' },
  { valor: 'EN_CURSO', texto: 'En curso' },
  { valor: 'CUMPLIDA', texto: 'Cumplida' },
  { valor: 'INCUMPLIDA', texto: 'Incumplida' },
];

export const DATASETS: Opcion<TipoDataset>[] = [
  { valor: 'CARTERA_MORA', texto: 'Cartera y morosidad' },
  { valor: 'PROSPECTOS', texto: 'Potenciales socios' },
  { valor: 'CENSO_INEC', texto: 'Censo INEC' },
];

export const ESTADOS_CARGA: Opcion<EstadoProcesamiento>[] = [
  { valor: 'PROCESADO', texto: 'Procesado' },
  { valor: 'CON_OBSERVACIONES', texto: 'Con observaciones' },
  { valor: 'FALLIDO', texto: 'Fallido' },
];

export const ROLES: Opcion<RolUsuario>[] = [
  { valor: 'ADMIN', texto: 'Administrador' },
  { valor: 'JEFE_AGENCIA', texto: 'Jefe de Agencia' },
  { valor: 'OFICIAL_CREDITO', texto: 'Oficial de Crédito' },
  { valor: 'SUPERVISOR_METODOLOGICO', texto: 'Supervisor Metodológico' },
];

export const EVENTOS: Opcion<TipoEvento>[] = [
  { valor: 'CREACION', texto: 'Creación' },
  { valor: 'MODIFICACION', texto: 'Modificación' },
  { valor: 'ELIMINACION', texto: 'Eliminación' },
  { valor: 'CARGA_CSV', texto: 'Carga CSV' },
  { valor: 'AJUSTE_PARAMETRO', texto: 'Ajuste de parámetro' },
  { valor: 'ACCESO', texto: 'Acceso' },
  { valor: 'ACCESO_FALLIDO', texto: 'Acceso fallido' },
  { valor: 'BLOQUEO_CUENTA', texto: 'Bloqueo de cuenta' },
];

export const RECOMENDACIONES: Opcion<Recomendacion>[] = [
  { valor: 'BRIGADA_PRIORITARIA', texto: 'Brigada prioritaria' },
  { valor: 'BRIGADA_PROGRAMADA', texto: 'Brigada programada' },
  { valor: 'SEGUIMIENTO', texto: 'Seguimiento' },
];

/** Texto visible de un código; si no está catalogado se muestra tal cual. */
export function textoDe<T extends string>(opciones: Opcion<T>[], valor: T): string {
  return opciones.find((o) => o.valor === valor)?.texto ?? valor;
}

export const COLOR_ESTADO_RUTA: Record<EstadoRuta, ColorIonic> = {
  PENDIENTE: 'warning',
  EN_CURSO: 'primary',
  CUMPLIDA: 'success',
  INCUMPLIDA: 'danger',
};

export const COLOR_ESTADO_CARGA: Record<EstadoProcesamiento, ColorIonic> = {
  PROCESADO: 'success',
  CON_OBSERVACIONES: 'warning',
  FALLIDO: 'danger',
};

export const COLOR_RECOMENDACION: Record<Recomendacion, ColorIonic> = {
  BRIGADA_PRIORITARIA: 'success',
  BRIGADA_PROGRAMADA: 'primary',
  SEGUIMIENTO: 'warning',
};

export interface Modulo {
  ruta: NombreEntidad;
  titulo: string;
  icono: string;
}

export const MODULOS: Modulo[] = [
  { ruta: 'zonas', titulo: 'Zonas', icono: 'map-outline' },
  { ruta: 'agencias', titulo: 'Agencias', icono: 'business-outline' },
  { ruta: 'barrios', titulo: 'Barrios', icono: 'home-outline' },
  { ruta: 'potenciales-socios', titulo: 'Potenciales socios', icono: 'people-outline' },
  { ruta: 'indicadores', titulo: 'Indicadores', icono: 'stats-chart-outline' },
  { ruta: 'hojas-ruta', titulo: 'Hojas de ruta', icono: 'navigate-outline' },
  { ruta: 'cargas-csv', titulo: 'Cargas CSV', icono: 'cloud-upload-outline' },
  { ruta: 'parametros', titulo: 'Parámetros', icono: 'options-outline' },
  { ruta: 'usuarios', titulo: 'Usuarios', icono: 'person-circle-outline' },
  { ruta: 'bitacora', titulo: 'Bitácora', icono: 'document-text-outline' },
];
