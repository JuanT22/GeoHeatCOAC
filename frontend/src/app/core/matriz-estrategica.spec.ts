import {
  calcularMorosidad,
  calcularOportunidad,
  calcularPosicionamiento,
  clasificarCuadrante,
  colorCuadrante,
  colorTermico,
  construirCeldas,
  evaluarMatriz,
  intensidadTermica,
  PARAMETROS_POR_DEFECTO,
  parametrosDesde,
  semanaIso,
  textoCuadrante,
  valorCapa,
} from './matriz-estrategica';
import { Cuadrante, PuntoMapaCalor } from './modelos';

function punto(datos: Partial<PuntoMapaCalor>): PuntoMapaCalor {
  return {
    barrio: 1,
    nombre_barrio: 'San Sebastián',
    agencia_nombre: 'Oficina Norte',
    zona_nombre: 'Zona 1 - Norte',
    canton: 'Loja',
    latitud: -4,
    longitud: -79.2,
    periodo_corte: '2026-10-31',
    cartera_colocada: 41200,
    numero_creditos: 18,
    indice_morosidad_porcentaje: 2.1,
    potenciales_socios: 120,
    densidad_poblacional_inec: 5200,
    cuadrante: 'VISITAS_FRECUENTES',
    ...datos,
  };
}

describe('Matriz Estratégica 2x2', () => {
  it.each<[string, number, number, number, number, Cuadrante]>([
    ['Alta/Fuerte', 5000, 100, 30000, 2, 'VISITAS_FRECUENTES'],
    ['Alta/Débil', 5000, 100, 5000, 9, 'REFORZAR_POSICION'],
    ['Baja/Fuerte', 500, 10, 30000, 2, 'VISITAS_MODERADAS'],
    ['Baja/Débil', 500, 10, 5000, 9, 'VISITAS_MINIMAS'],
    ['sin cartera no hay posición', 5000, 100, 0, 0, 'REFORZAR_POSICION'],
    ['el umbral exacto cuenta como Alta', 2500, 50, 0, 0, 'REFORZAR_POSICION'],
  ])('%s', (_, densidad, potenciales, cartera, morosidad, esperado) => {
    expect(evaluarMatriz({ densidad, potenciales, cartera, morosidad }).cuadrante).toBe(esperado);
  });

  // Mismos barrios que carga el backend: la vista previa debe coincidir con lo que guarda la API.
  it.each<[string, number, number, number, number, Cuadrante]>([
    ['San Sebastián', 5200, 120, 41200, 2.1, 'VISITAS_FRECUENTES'],
    ['El Rosal', 4100, 88, 12400, 7.8, 'REFORZAR_POSICION'],
    ['La Argelia', 2300, 42, 27900, 2.6, 'VISITAS_MODERADAS'],
    ['El Capulí', 1900, 35, 9800, 9.4, 'VISITAS_MINIMAS'],
  ])('coincide con el backend en %s', (_, densidad, potenciales, cartera, morosidad, esperado) => {
    expect(evaluarMatriz({ densidad, potenciales, cartera, morosidad }).cuadrante).toBe(esperado);
  });

  it('clasifica las cuatro combinaciones de niveles', () => {
    expect(clasificarCuadrante('ALTA', 'FUERTE')).toBe('VISITAS_FRECUENTES');
    expect(clasificarCuadrante('ALTA', 'DEBIL')).toBe('REFORZAR_POSICION');
    expect(clasificarCuadrante('BAJA', 'FUERTE')).toBe('VISITAS_MODERADAS');
    expect(clasificarCuadrante('BAJA', 'DEBIL')).toBe('VISITAS_MINIMAS');
  });

  it('acota los puntajes a 0-100', () => {
    expect(calcularOportunidad({ densidad: 1e9, potenciales: 1e9 })).toBe(100);
    expect(calcularOportunidad({ densidad: 0, potenciales: 0 })).toBe(0);
    expect(calcularPosicionamiento({ cartera: 1e9, morosidad: 0 })).toBe(100);
    expect(calcularPosicionamiento({ cartera: 0, morosidad: 0 })).toBe(0);
    expect(calcularPosicionamiento({ cartera: 1, morosidad: 100 })).toBeLessThan(1);
  });

  it('usa los parámetros vigentes y no altera los valores por defecto', () => {
    const p = parametrosDesde([
      { clave_parametro: 'UMBRAL_OPORTUNIDAD', valor_numerico: 99 },
      { clave_parametro: 'LINEA_BASE_CARTERA', valor_numerico: 1 },
    ]);
    const datos = { densidad: 4600, potenciales: 95, cartera: 33500, morosidad: 3.2 };
    expect(evaluarMatriz(datos).cuadrante).toBe('VISITAS_FRECUENTES');
    expect(evaluarMatriz(datos, p).cuadrante).toBe('VISITAS_MODERADAS');
    expect(PARAMETROS_POR_DEFECTO.UMBRAL_OPORTUNIDAD).toBe(50);
    expect(p).not.toHaveProperty('LINEA_BASE_CARTERA');
  });

  it('tolera pesos y referencias en cero', () => {
    const p = {
      ...PARAMETROS_POR_DEFECTO,
      PESO_CARTERA: 0,
      PESO_MOROSIDAD: 0,
      REF_CARTERA: 0,
      MOROSIDAD_MAXIMA: 0,
    };
    expect(calcularPosicionamiento({ cartera: 100, morosidad: 0 }, p)).toBe(100);
    expect(calcularPosicionamiento({ cartera: 100, morosidad: 1 }, p)).toBe(50);
  });

  it('asigna los colores de Ionic y textos por cuadrante', () => {
    expect(colorCuadrante('VISITAS_FRECUENTES')).toBe('success');
    expect(colorCuadrante('REFORZAR_POSICION')).toBe('warning');
    expect(colorCuadrante('VISITAS_MODERADAS')).toBe('primary');
    expect(colorCuadrante('VISITAS_MINIMAS')).toBe('danger');
    expect(colorCuadrante('')).toBe('medium');
    expect(textoCuadrante('REFORZAR_POSICION')).toBe('Reforzar posición');
    expect(textoCuadrante('')).toBe('Sin clasificar');
  });

  it('calcula la morosidad con dos decimales', () => {
    expect(calcularMorosidad(10000, 900)).toBe(9);
    expect(calcularMorosidad(30000, 1000)).toBe(3.33);
    expect(calcularMorosidad(0, 0)).toBe(0);
  });
});

describe('Escala térmica', () => {
  it('normaliza la intensidad entre 0 y 1', () => {
    expect(intensidadTermica(0, 0, 10)).toBe(0);
    expect(intensidadTermica(5, 0, 10)).toBe(0.5);
    expect(intensidadTermica(10, 0, 10)).toBe(1);
    expect(intensidadTermica(-5, 0, 10)).toBe(0);
    expect(intensidadTermica(50, 0, 10)).toBe(1);
  });

  it('resuelve los casos sin variación o sin datos', () => {
    expect(intensidadTermica(7, 7, 7)).toBe(0.5);
    expect(intensidadTermica(NaN, 0, 10)).toBe(0);
    expect(intensidadTermica(1, Infinity, -Infinity)).toBe(0);
  });

  it('va de verde a amarillo y a rojo', () => {
    expect(colorTermico(0)).toBe('rgb(46, 158, 79)');
    expect(colorTermico(0.5)).toBe('rgb(242, 194, 48)');
    expect(colorTermico(1)).toBe('rgb(198, 40, 40)');
    expect(colorTermico(2)).toBe(colorTermico(1));
    expect(colorTermico(NaN)).toBe(colorTermico(0));
  });

  it('lee el valor de cada capa', () => {
    const p = punto({});
    expect(valorCapa(p, 'CARTERA')).toBe(41200);
    expect(valorCapa(p, 'MOROSIDAD')).toBe(2.1);
    expect(valorCapa(p, 'POTENCIALES_SOCIOS')).toBe(120);
    expect(valorCapa(p, 'DENSIDAD_INEC')).toBe(5200);
  });

  it('construye celdas ordenadas con su intensidad y color de cuadrante', () => {
    const celdas = construirCeldas(
      [
        punto({ barrio: 1, cartera_colocada: 0 }),
        punto({ barrio: 2, cartera_colocada: 100, cuadrante: 'VISITAS_MINIMAS' }),
        punto({ barrio: 3, cartera_colocada: 50 }),
      ],
      'CARTERA',
    );
    expect(celdas.map((c) => c.punto.barrio)).toEqual([2, 3, 1]);
    expect(celdas.map((c) => c.intensidad)).toEqual([1, 0.5, 0]);
    expect(celdas[0].colorCuadrante).toBe('danger');
    expect(construirCeldas([], 'CARTERA')).toEqual([]);
  });
});

describe('semanaIso', () => {
  it.each<[string, number | null]>([
    ['2026-01-12', 3],
    ['2026-11-16', 47],
    ['2025-12-29', 1], // pertenece a la semana 1 de 2026
    ['2027-01-01', 53], // pertenece a la semana 53 de 2026
    ['2026-02-31', null],
    ['', null],
  ])('%s → %s', (fecha, semana) => {
    expect(semanaIso(fecha)).toBe(semana);
  });
});
