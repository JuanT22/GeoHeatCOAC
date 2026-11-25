/**
 * Matriz Estratégica 2x2 y escala térmica (RF-006, RF-009). Solo funciones puras: reproducen el motor
 * del backend (backend/geoheat/matriz.py) para anticipar resultados en pantalla; el valor oficial
 * siempre es el que guarda la API.
 */
import { CapaTermica, Cuadrante, ParametroAnalitico, PuntoMapaCalor } from './modelos';

export type ColorIonic = 'success' | 'warning' | 'primary' | 'danger' | 'medium';
export type NivelOportunidad = 'ALTA' | 'BAJA';
export type NivelPosicionamiento = 'FUERTE' | 'DEBIL';

export interface ParametrosMatriz {
  UMBRAL_OPORTUNIDAD: number;
  UMBRAL_POSICIONAMIENTO: number;
  PESO_POTENCIALES: number;
  PESO_DENSIDAD: number;
  PESO_CARTERA: number;
  PESO_MOROSIDAD: number;
  REF_POTENCIALES: number;
  REF_DENSIDAD: number;
  REF_CARTERA: number;
  MOROSIDAD_MAXIMA: number;
}

export const PARAMETROS_POR_DEFECTO: Readonly<ParametrosMatriz> = {
  UMBRAL_OPORTUNIDAD: 50,
  UMBRAL_POSICIONAMIENTO: 60,
  PESO_POTENCIALES: 0.5,
  PESO_DENSIDAD: 0.5,
  PESO_CARTERA: 0.6,
  PESO_MOROSIDAD: 0.4,
  REF_POTENCIALES: 100,
  REF_DENSIDAD: 5000,
  REF_CARTERA: 23758,
  MOROSIDAD_MAXIMA: 10,
};

export interface DatosMatriz {
  densidad: number;
  potenciales: number;
  cartera: number;
  morosidad: number;
}

export interface ResultadoMatriz {
  oportunidad: number;
  posicionamiento: number;
  nivelOportunidad: NivelOportunidad;
  nivelPosicionamiento: NivelPosicionamiento;
  cuadrante: Cuadrante;
}

/** Combina los valores por defecto con los parámetros vigentes en la base de datos (RF-013). */
export function parametrosDesde(
  registros: Pick<ParametroAnalitico, 'clave_parametro' | 'valor_numerico'>[],
) {
  const parametros: ParametrosMatriz = { ...PARAMETROS_POR_DEFECTO };
  for (const { clave_parametro, valor_numerico } of registros) {
    if (clave_parametro in parametros) {
      parametros[clave_parametro as keyof ParametrosMatriz] = Number(valor_numerico);
    }
  }
  return parametros;
}

/** Valor relativo a su referencia, acotado a [0, 1]. */
function proporcion(valor: number, referencia: number): number {
  if (referencia <= 0) {
    return valor > 0 ? 1 : 0;
  }
  return Math.min(Math.max(valor, 0) / referencia, 1);
}

function ponderar(a: number, pesoA: number, b: number, pesoB: number): number {
  const total = pesoA + pesoB;
  const promedio = total > 0 ? (a * pesoA + b * pesoB) / total : (a + b) / 2;
  // Se descarta el ruido de coma flotante para que el umbral exacto cuente como alcanzado.
  return Math.round(promedio * 1e8) / 1e6;
}

/** Índice de morosidad (%) con dos decimales, igual que el backend. */
export function calcularMorosidad(colocada: number, vencida: number): number {
  return colocada > 0 ? Math.round((vencida / colocada) * 10000) / 100 : 0;
}

export function calcularOportunidad(
  d: Pick<DatosMatriz, 'densidad' | 'potenciales'>,
  p = PARAMETROS_POR_DEFECTO,
) {
  return ponderar(
    proporcion(d.potenciales, p.REF_POTENCIALES),
    p.PESO_POTENCIALES,
    proporcion(d.densidad, p.REF_DENSIDAD),
    p.PESO_DENSIDAD,
  );
}

/** Sin cartera colocada no hay posicionamiento. */
export function calcularPosicionamiento(
  d: Pick<DatosMatriz, 'cartera' | 'morosidad'>,
  p = PARAMETROS_POR_DEFECTO,
) {
  if (d.cartera <= 0) {
    return 0;
  }
  return ponderar(
    proporcion(d.cartera, p.REF_CARTERA),
    p.PESO_CARTERA,
    1 - proporcion(d.morosidad, p.MOROSIDAD_MAXIMA),
    p.PESO_MOROSIDAD,
  );
}

export function clasificarCuadrante(
  oportunidad: NivelOportunidad,
  posicion: NivelPosicionamiento,
): Cuadrante {
  if (oportunidad === 'ALTA') {
    return posicion === 'FUERTE' ? 'VISITAS_FRECUENTES' : 'REFORZAR_POSICION';
  }
  return posicion === 'FUERTE' ? 'VISITAS_MODERADAS' : 'VISITAS_MINIMAS';
}

export function evaluarMatriz(
  datos: DatosMatriz,
  p: ParametrosMatriz = PARAMETROS_POR_DEFECTO,
): ResultadoMatriz {
  const oportunidad = calcularOportunidad(datos, p);
  const posicionamiento = calcularPosicionamiento(datos, p);
  const nivelOportunidad = oportunidad >= p.UMBRAL_OPORTUNIDAD ? 'ALTA' : 'BAJA';
  const nivelPosicionamiento = posicionamiento >= p.UMBRAL_POSICIONAMIENTO ? 'FUERTE' : 'DEBIL';
  return {
    oportunidad,
    posicionamiento,
    nivelOportunidad,
    nivelPosicionamiento,
    cuadrante: clasificarCuadrante(nivelOportunidad, nivelPosicionamiento),
  };
}

// --- Presentación ------------------------------------------------------------------

export const CUADRANTES: { valor: Cuadrante; texto: string; descripcion: string }[] = [
  {
    valor: 'VISITAS_FRECUENTES',
    texto: 'Visitas frecuentes',
    descripcion: 'Oportunidad alta, posición fuerte',
  },
  {
    valor: 'REFORZAR_POSICION',
    texto: 'Reforzar posición',
    descripcion: 'Oportunidad alta, posición débil',
  },
  {
    valor: 'VISITAS_MODERADAS',
    texto: 'Visitas moderadas',
    descripcion: 'Oportunidad baja, posición fuerte',
  },
  {
    valor: 'VISITAS_MINIMAS',
    texto: 'Visitas mínimas',
    descripcion: 'Oportunidad baja, posición débil',
  },
];

const COLORES: Record<Cuadrante, ColorIonic> = {
  VISITAS_FRECUENTES: 'success',
  REFORZAR_POSICION: 'warning',
  VISITAS_MODERADAS: 'primary',
  VISITAS_MINIMAS: 'danger',
};

export function colorCuadrante(cuadrante: Cuadrante | ''): ColorIonic {
  return cuadrante ? COLORES[cuadrante] : 'medium';
}

export function textoCuadrante(cuadrante: Cuadrante | ''): string {
  return CUADRANTES.find((c) => c.valor === cuadrante)?.texto ?? 'Sin clasificar';
}

export const CAPAS: {
  valor: CapaTermica;
  texto: string;
  unidad: 'USD' | '%' | 'socios' | 'hab/km²';
}[] = [
  { valor: 'CARTERA', texto: 'Cartera colocada', unidad: 'USD' },
  { valor: 'MOROSIDAD', texto: 'Índice de morosidad', unidad: '%' },
  { valor: 'POTENCIALES_SOCIOS', texto: 'Potenciales socios', unidad: 'socios' },
  { valor: 'DENSIDAD_INEC', texto: 'Densidad INEC', unidad: 'hab/km²' },
];

/** Valor del barrio para la capa térmica elegida. */
export function valorCapa(punto: PuntoMapaCalor, capa: CapaTermica): number {
  switch (capa) {
    case 'CARTERA':
      return punto.cartera_colocada;
    case 'MOROSIDAD':
      return punto.indice_morosidad_porcentaje;
    case 'POTENCIALES_SOCIOS':
      return punto.potenciales_socios;
    case 'DENSIDAD_INEC':
      return punto.densidad_poblacional_inec;
  }
}

/** Posición de un valor entre el mínimo y el máximo visibles, en [0, 1]. Sin variación devuelve 0,5. */
export function intensidadTermica(valor: number, minimo: number, maximo: number): number {
  if (![valor, minimo, maximo].every(Number.isFinite) || maximo < minimo) {
    return 0;
  }
  if (maximo === minimo) {
    return 0.5;
  }
  return Math.min(Math.max((valor - minimo) / (maximo - minimo), 0), 1);
}

const RAMPA = [
  [46, 158, 79], // verde
  [242, 194, 48], // amarillo
  [198, 40, 40], // rojo
];

/** Transición verde → amarillo → rojo exigida por RF-006. */
export function colorTermico(intensidad: number): string {
  const t =
    Math.min(Math.max(Number.isFinite(intensidad) ? intensidad : 0, 0), 1) * (RAMPA.length - 1);
  const tramo = Math.min(Math.floor(t), RAMPA.length - 2);
  const canal = (i: number) =>
    Math.round(RAMPA[tramo][i] + (RAMPA[tramo + 1][i] - RAMPA[tramo][i]) * (t - tramo));
  return `rgb(${canal(0)}, ${canal(1)}, ${canal(2)})`;
}

export interface CeldaMapa {
  punto: PuntoMapaCalor;
  valor: number;
  intensidad: number;
  color: string;
  colorCuadrante: ColorIonic;
  textoCuadrante: string;
}

/** Celdas del mapa de calor, de mayor a menor valor de la capa. */
export function construirCeldas(puntos: PuntoMapaCalor[], capa: CapaTermica): CeldaMapa[] {
  const valores = puntos.map((p) => valorCapa(p, capa));
  const minimo = valores.reduce((a, b) => Math.min(a, b), Infinity);
  const maximo = valores.reduce((a, b) => Math.max(a, b), -Infinity);
  return puntos
    .map((punto, i) => {
      const intensidad = intensidadTermica(valores[i], minimo, maximo);
      return {
        punto,
        valor: valores[i],
        intensidad,
        color: colorTermico(intensidad),
        colorCuadrante: colorCuadrante(punto.cuadrante),
        textoCuadrante: textoCuadrante(punto.cuadrante),
      };
    })
    .sort((a, b) => b.valor - a.valor || a.punto.barrio - b.punto.barrio);
}

/** Número de semana ISO 8601 de una fecha AAAA-MM-DD, la numeración que valida el backend. */
export function semanaIso(fecha: string): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!partes) {
    return null;
  }
  const dia = new Date(Date.UTC(+partes[1], +partes[2] - 1, +partes[3]));
  if (dia.toISOString().slice(0, 10) !== fecha) {
    return null;
  }
  dia.setUTCDate(dia.getUTCDate() + 4 - (dia.getUTCDay() || 7)); // jueves de la misma semana
  const inicio = Date.UTC(dia.getUTCFullYear(), 0, 1);
  return Math.ceil(((dia.getTime() - inicio) / 86_400_000 + 1) / 7);
}
