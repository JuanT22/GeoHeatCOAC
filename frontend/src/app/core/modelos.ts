/** Interfaces de la API REST de GeoHeat COAC (backend/geoheat/serializers.py). */

export type Cuadrante =
  'VISITAS_FRECUENTES' | 'REFORZAR_POSICION' | 'VISITAS_MODERADAS' | 'VISITAS_MINIMAS';
export type Provincia = 'Loja' | 'Zamora Chinchipe' | 'El Oro';
export type ActividadEconomica = 'MICROEMPRESA' | 'COMERCIO' | 'AGROPECUARIO' | 'SERVICIOS';
export type OrigenRegistro = 'CAMPO' | 'CSV';
export type TipoGestion = 'COBRANZA' | 'NOVACION' | 'PROMOCION' | 'BRIGADA';
export type EstadoRuta = 'PENDIENTE' | 'EN_CURSO' | 'CUMPLIDA' | 'INCUMPLIDA';
export type TipoDataset = 'CARTERA_MORA' | 'PROSPECTOS' | 'CENSO_INEC';
export type EstadoProcesamiento = 'PROCESADO' | 'CON_OBSERVACIONES' | 'FALLIDO';
export type RolUsuario = 'ADMIN' | 'JEFE_AGENCIA' | 'OFICIAL_CREDITO' | 'SUPERVISOR_METODOLOGICO';
export type TipoEvento =
  | 'CREACION'
  | 'MODIFICACION'
  | 'ELIMINACION'
  | 'CARGA_CSV'
  | 'AJUSTE_PARAMETRO'
  | 'ACCESO'
  | 'ACCESO_FALLIDO'
  | 'BLOQUEO_CUENTA';
export type Recomendacion = 'BRIGADA_PRIORITARIA' | 'BRIGADA_PROGRAMADA' | 'SEGUIMIENTO';
export type CapaTermica = 'CARTERA' | 'MOROSIDAD' | 'POTENCIALES_SOCIOS' | 'DENSIDAD_INEC';

/** Respuesta paginada de Django REST Framework. */
export interface Pagina<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ZonaComercial {
  id: number;
  codigo_zona: string;
  nombre_zona: string;
  descripcion: string;
  readonly total_agencias: number;
}

export interface Agencia {
  id: number;
  zona: number;
  readonly zona_nombre: string;
  nombre_agencia: string;
  direccion: string;
  latitud_central: number;
  longitud_central: number;
}

export interface Barrio {
  id: number;
  agencia: number;
  readonly agencia_nombre: string;
  readonly zona: number;
  readonly zona_nombre: string;
  codigo_inec: string;
  nombre_barrio: string;
  parroquia: string;
  canton: string;
  provincia: Provincia;
  latitud_centroide: number;
  longitud_centroide: number;
  densidad_poblacional_inec: number;
  numero_familias_estimado: number;
  readonly estrategia_2x2: Cuadrante | '';
  readonly total_potenciales_registrados: number;
}

export interface PotencialSocio {
  id: number;
  barrio: number;
  readonly barrio_nombre: string;
  readonly canton: string;
  identificacion: string;
  nombre_completo: string;
  actividad_economica: ActividadEconomica;
  latitud: number;
  longitud: number;
  direccion_referencia: string;
  monto_credito_estimado: number;
  origen_registro: OrigenRegistro;
  readonly fecha_registro: string;
}

export interface IndicadorBarrio {
  id: number;
  barrio: number;
  readonly barrio_nombre: string;
  readonly agencia_nombre: string;
  periodo_corte: string;
  monto_cartera_colocada: number;
  numero_creditos_activos: number;
  monto_cartera_vencida: number;
  indice_morosidad_porcentaje: number;
  total_socios_activos: number;
  total_potenciales_socios: number;
  readonly cuadrante_matriz_2x2: Cuadrante;
  readonly estrategia_sugerida: string;
}

export interface HojaRutaSemanal {
  id: number;
  agencia: number;
  readonly agencia_nombre: string;
  barrio: number;
  readonly barrio_nombre: string;
  oficial_credito: string;
  semana_numero: number;
  fecha_programada: string;
  tipo_gestion: TipoGestion;
  estado: EstadoRuta;
  observaciones: string;
}

export interface ArchivoCargaCSV {
  id: number;
  nombre_archivo: string;
  tipo_dataset: TipoDataset;
  total_filas_leidas: number;
  filas_validas: number;
  filas_con_error: number;
  estado_procesamiento: EstadoProcesamiento;
  detalle_errores: string;
  readonly fecha_carga: string;
}

export interface ParametroAnalitico {
  id: number;
  clave_parametro: string;
  descripcion: string;
  valor_numerico: number;
  readonly actualizado: string;
}

export interface BitacoraAuditoria {
  id: number;
  usuario_responsable: string;
  tipo_evento: TipoEvento;
  entidad_afectada: string;
  detalle_cambio: string;
  readonly fecha_hora: string;
}

export interface PerfilUsuario {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  /** Solo se envía; la API nunca la devuelve. */
  password?: string;
  rol: RolUsuario;
  readonly rol_nombre: string;
  agencia: number | null;
  readonly agencia_nombre: string | null;
  readonly intentos_fallidos: number;
  readonly bloqueado_hasta: string | null;
  readonly esta_bloqueado: boolean;
}

/** Ruta de la API → interfaz de sus registros. */
export interface EntidadesApi {
  zonas: ZonaComercial;
  agencias: Agencia;
  barrios: Barrio;
  'potenciales-socios': PotencialSocio;
  indicadores: IndicadorBarrio;
  'hojas-ruta': HojaRutaSemanal;
  'cargas-csv': ArchivoCargaCSV;
  parametros: ParametroAnalitico;
  bitacora: BitacoraAuditoria;
  usuarios: PerfilUsuario;
}
export type NombreEntidad = keyof EntidadesApi;

// --- Autenticación ---------------------------------------------------------------

export interface Credenciales {
  username: string;
  password: string;
}

export interface Sesion {
  token: string | null;
  expira: string | null;
  username: string;
  nombre_completo: string;
  rol: RolUsuario;
  rol_nombre: string;
  agencia_nombre: string | null;
}

// --- Dashboard -------------------------------------------------------------------

export interface FiltrosDashboard {
  zona?: number | null;
  agencia?: number | null;
  canton?: string | null;
  oficial_credito?: string | null;
  actividad_economica?: ActividadEconomica | null;
  cuadrante?: Cuadrante | null;
}

export interface KpisBase {
  total_barrios: number;
  cartera_total_colocada: number;
  cartera_total_vencida: number;
  numero_creditos: number;
  promedio_creditos_por_barrio: number;
  cartera_promedio_por_barrio: number;
  indice_morosidad_porcentaje: number;
  total_socios_activos: number;
  total_potenciales_socios: number;
}

export interface KpisZona extends KpisBase {
  zona: number;
  zona_nombre: string;
}

export interface PuntoMapaCalor {
  barrio: number;
  nombre_barrio: string;
  agencia_nombre: string;
  zona_nombre: string;
  canton: string;
  latitud: number;
  longitud: number;
  periodo_corte: string;
  cartera_colocada: number;
  numero_creditos: number;
  indice_morosidad_porcentaje: number;
  potenciales_socios: number;
  densidad_poblacional_inec: number;
  cuadrante: Cuadrante;
}

export interface ResumenKpis extends KpisBase {
  potenciales_registrados: number;
  distribucion_matriz_2x2: Record<Cuadrante, number>;
  por_zona: KpisZona[];
  linea_base: {
    cartera_total: number | null;
    numero_creditos: number | null;
    total_barrios: number | null;
  };
  puntos_mapa_calor: PuntoMapaCalor[];
}

export interface Cumplimiento {
  total_rutas: number;
  por_estado: Record<EstadoRuta, number>;
  porcentaje_cumplimiento: number;
  porcentaje_sobre_cerradas: number;
}

export interface ReporteCumplimiento extends Cumplimiento {
  por_oficial: (Cumplimiento & { oficial_credito: string })[];
  por_agencia: (Cumplimiento & { agencia: number; agencia_nombre: string })[];
  visitas_no_realizadas: {
    id: number;
    barrio: number;
    nombre_barrio: string;
    oficial_credito: string;
    fecha_programada: string;
    estado: EstadoRuta;
  }[];
  variacion_por_barrio: {
    barrio: number;
    nombre_barrio: string;
    periodo_anterior: string;
    periodo_actual: string;
    variacion_cartera: number;
    variacion_morosidad: number;
  }[];
}

export interface ProyeccionBarrio {
  posicion: number;
  barrio: number;
  nombre_barrio: string;
  canton: string;
  agencia_nombre: string;
  zona_nombre: string;
  latitud: number;
  longitud: number;
  periodo_corte: string;
  densidad_poblacional_inec: number;
  potenciales_socios: number;
  indice_morosidad_porcentaje: number;
  cuadrante: Cuadrante;
  score_crecimiento: number;
  demanda_proyectada: number;
  recomendacion: Recomendacion;
  detalle_recomendacion: string;
}

export interface ProyeccionExpansion {
  total_barrios: number;
  demanda_total_proyectada: number;
  brigadas_prioritarias: number;
  validacion: { observaciones: number; correlacion_spearman: number | null; nota: string };
  ranking: ProyeccionBarrio[];
}

// --- Carga de CSV ----------------------------------------------------------------

export interface ResultadoCarga extends ArchivoCargaCSV {
  indicadores_creados: number;
  indicadores_actualizados: number;
  barrios_creados: number;
}

/** Lo que consumen las vistas: datos, espera y error de una consulta. */
export interface Estado<T> {
  cargando: boolean;
  datos: T | null;
  error: string | null;
}
