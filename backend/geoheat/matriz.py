"""Motor de la Matriz Estratégica 2x2 (RF-009), parametrizado por ParametroAnalitico (RF-013).

    Oportunidad     = promedio ponderado de potenciales socios y densidad INEC (0-100)
    Posicionamiento = promedio ponderado de cartera colocada y calidad de cartera (0-100)
"""
from decimal import Decimal

PARAMETROS_POR_DEFECTO = {
    'UMBRAL_OPORTUNIDAD': (Decimal('50'), 'Puntaje mínimo (0-100) para considerar Oportunidad Alta'),
    'UMBRAL_POSICIONAMIENTO': (Decimal('60'), 'Puntaje mínimo (0-100) para considerar Posicionamiento Fuerte'),
    'PESO_POTENCIALES': (Decimal('0.50'), 'Peso de los potenciales socios en el Nivel de Oportunidad'),
    'PESO_DENSIDAD': (Decimal('0.50'), 'Peso de la densidad poblacional INEC en el Nivel de Oportunidad'),
    'PESO_CARTERA': (Decimal('0.60'), 'Peso de la cartera colocada en el Posicionamiento del Asesor'),
    'PESO_MOROSIDAD': (Decimal('0.40'), 'Peso de la morosidad en el Posicionamiento del Asesor'),
    'REF_POTENCIALES': (Decimal('100'), 'Potenciales socios por barrio que equivalen al 100% del puntaje'),
    'REF_DENSIDAD': (Decimal('5000'), 'Habitantes por km² que equivalen al 100% del puntaje'),
    'REF_CARTERA': (Decimal('23758'), 'Cartera promedio institucional por barrio (USD)'),
    'MOROSIDAD_MAXIMA': (Decimal('10'), 'Índice de morosidad (%) a partir del cual la calidad vale 0'),
    'PESO_SCORE_DENSIDAD': (Decimal('0.30'), 'Peso de la densidad INEC en el score de crecimiento'),
    'PESO_SCORE_POTENCIALES': (Decimal('0.40'), 'Peso de los potenciales socios en el score de crecimiento'),
    'PESO_SCORE_MOROSIDAD': (Decimal('0.30'), 'Peso de la baja morosidad en el score de crecimiento'),
    'UMBRAL_BRIGADA': (Decimal('70'), 'Score mínimo (0-100) para recomendar una brigada prioritaria'),
    'UMBRAL_SEGUIMIENTO': (Decimal('45'), 'Score mínimo (0-100) para programar una brigada'),
    'DENSIDAD_BAJA': (Decimal('500'), 'Densidad (hab/km²) por debajo de la cual se considera baja'),
}

ESTRATEGIAS = {
    'VISITAS_FRECUENTES': 'Visitas frecuentes: oportunidad alta y posicionamiento fuerte; profundizar y fidelizar.',
    'REFORZAR_POSICION': 'Visitas frecuentes para reforzar posición: oportunidad alta y posicionamiento débil.',
    'VISITAS_MODERADAS': 'Visitas moderadas: oportunidad baja y posicionamiento fuerte; mantener la cartera.',
    'VISITAS_MINIMAS': 'Visitas mínimas: oportunidad baja y posicionamiento débil; optimizar el costo operativo.',
}
ALERTA_COSTO = ' ALERTA: baja densidad INEC y alta morosidad; priorizar cobranza focalizada.'


def obtener_parametros():
    from .models import ParametroAnalitico

    valores = {clave: valor for clave, (valor, _) in PARAMETROS_POR_DEFECTO.items()}
    valores.update(
        ParametroAnalitico.objects.filter(clave_parametro__in=list(valores))
        .values_list('clave_parametro', 'valor_numerico')
    )
    return valores


def _proporcion(valor, referencia):
    """Valor relativo a su referencia, acotado a [0, 1]."""
    if referencia <= 0:
        return Decimal(1) if valor > 0 else Decimal(0)
    return min(Decimal(valor) / referencia, Decimal(1))


def _ponderar(a, peso_a, b, peso_b):
    total = peso_a + peso_b
    if total <= 0:
        return (a + b) / 2 * 100
    return (a * peso_a + b * peso_b) / total * 100


def evaluar(densidad, potenciales, cartera, morosidad, p):
    """Devuelve (cuadrante, estrategia_sugerida) para los datos de un barrio."""
    oportunidad = _ponderar(
        _proporcion(potenciales, p['REF_POTENCIALES']), p['PESO_POTENCIALES'],
        _proporcion(densidad, p['REF_DENSIDAD']), p['PESO_DENSIDAD'],
    )
    if cartera > 0:
        posicion = _ponderar(
            _proporcion(cartera, p['REF_CARTERA']), p['PESO_CARTERA'],
            1 - _proporcion(morosidad, p['MOROSIDAD_MAXIMA']), p['PESO_MOROSIDAD'],
        )
    else:  # sin cartera colocada no hay posicionamiento
        posicion = Decimal(0)

    alta = oportunidad >= p['UMBRAL_OPORTUNIDAD']
    fuerte = posicion >= p['UMBRAL_POSICIONAMIENTO']
    if alta:
        cuadrante = 'VISITAS_FRECUENTES' if fuerte else 'REFORZAR_POSICION'
    else:
        cuadrante = 'VISITAS_MODERADAS' if fuerte else 'VISITAS_MINIMAS'

    estrategia = ESTRATEGIAS[cuadrante]
    if densidad < p['DENSIDAD_BAJA'] and morosidad >= p['MOROSIDAD_MAXIMA']:  # CU-005, excepción 3a
        estrategia += ALERTA_COSTO
    return cuadrante, estrategia


def sincronizar_barrios(barrio_ids):
    """Copia en cada barrio el cuadrante de su indicador más reciente."""
    from .models import Barrio, IndicadorBarrio

    # En orden cronológico, el último de cada barrio prevalece.
    ultimos = dict(IndicadorBarrio.objects.filter(barrio__in=barrio_ids).order_by('periodo_corte')
                   .values_list('barrio_id', 'cuadrante_matriz_2x2'))
    cambiados = []
    for barrio in Barrio.objects.filter(pk__in=barrio_ids).only('pk', 'estrategia_2x2'):
        cuadrante = ultimos.get(barrio.pk, '')
        if barrio.estrategia_2x2 != cuadrante:
            barrio.estrategia_2x2 = cuadrante
            cambiados.append(barrio)
    Barrio.objects.bulk_update(cambiados, ['estrategia_2x2'], batch_size=500)


def recalcular(indicadores=None):
    """Reclasifica los indicadores dados (o todos) con los parámetros vigentes."""
    from .models import IndicadorBarrio

    if indicadores is None:
        indicadores = IndicadorBarrio.objects.all()
    p = obtener_parametros()
    cambiados = []
    for ind in indicadores.select_related('barrio'):
        nuevo = evaluar(
            ind.barrio.densidad_poblacional_inec, ind.total_potenciales_socios,
            ind.monto_cartera_colocada, ind.indice_morosidad_porcentaje, p,
        )
        if nuevo != (ind.cuadrante_matriz_2x2, ind.estrategia_sugerida):
            ind.cuadrante_matriz_2x2, ind.estrategia_sugerida = nuevo
            cambiados.append(ind)
    IndicadorBarrio.objects.bulk_update(
        cambiados, ['cuadrante_matriz_2x2', 'estrategia_sugerida'], batch_size=500)
    sincronizar_barrios({ind.barrio_id for ind in cambiados})
