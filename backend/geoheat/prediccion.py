"""Score predictivo de zonas de expansión (RF-012, CU-008).

score_crecimiento (0-100) = promedio ponderado de densidad INEC, potenciales socios y baja morosidad.
demanda_proyectada (USD)  = potenciales socios × crédito promedio × score / 100.
"""
from bisect import bisect_left, bisect_right
from decimal import Decimal
from statistics import StatisticsError, correlation

from django.db.models import Avg, Sum

from .kpis import filtrar_indicadores
from .matriz import _proporcion, obtener_parametros
from .models import IndicadorBarrio, PotencialSocio

MIN_OBSERVACIONES = 5


def calcular_score(densidad, potenciales, cartera, morosidad, p):
    # Sin cartera no hay evidencia de buen ni mal pago: se usa un valor neutro.
    calidad = 1 - _proporcion(morosidad, p['MOROSIDAD_MAXIMA']) if cartera > 0 else Decimal('0.5')
    factores = (
        (_proporcion(densidad, p['REF_DENSIDAD']), p['PESO_SCORE_DENSIDAD']),
        (_proporcion(potenciales, p['REF_POTENCIALES']), p['PESO_SCORE_POTENCIALES']),
        (calidad, p['PESO_SCORE_MOROSIDAD']),
    )
    total = sum(peso for _, peso in factores)
    if total <= 0:
        return round(sum(valor for valor, _ in factores) / len(factores) * 100, 2)
    return round(sum(valor * peso for valor, peso in factores) / total * 100, 2)


def recomendar(score, p):
    if score >= p['UMBRAL_BRIGADA']:
        return 'BRIGADA_PRIORITARIA', 'Programar brigada comercial esta semana y asignar oficial de crédito.'
    if score >= p['UMBRAL_SEGUIMIENTO']:
        return 'BRIGADA_PROGRAMADA', 'Incluir en la siguiente planificación mensual de brigadas.'
    return 'SEGUIMIENTO', 'Mantener seguimiento; todavía no se justifica una brigada.'


def _creditos_promedio(indicadores):
    """Crédito promedio: prospectos del barrio, o su cartera por crédito, o la media general."""
    prospectos = {
        f['barrio']: f['promedio'] for f in PotencialSocio.objects.order_by().values('barrio')
        .annotate(promedio=Avg('monto_credito_estimado'))}
    totales = IndicadorBarrio.objects.aggregate(
        cartera=Sum('monto_cartera_colocada'), creditos=Sum('numero_creditos_activos'))
    general = totales['cartera'] / totales['creditos'] if totales['creditos'] else Decimal(0)
    return {
        i.barrio_id: prospectos.get(i.barrio_id) or (
            i.monto_cartera_colocada / i.numero_creditos_activos if i.numero_creditos_activos else general)
        for i in indicadores}


def _rangos(valores):
    """Rangos promedio (los empates comparten rango), para la correlación de Spearman."""
    orden = sorted(valores)
    return [(bisect_left(orden, v) + bisect_right(orden, v) - 1) / 2 for v in valores]


def validar(p):
    """Backtest: ¿el score de un corte anticipó el crecimiento de cartera del corte siguiente?"""
    scores, crecimientos = [], []
    anterior = None
    for i in IndicadorBarrio.objects.prefetch_related('barrio').order_by('barrio_id', 'periodo_corte'):
        if anterior and anterior.barrio_id == i.barrio_id and anterior.monto_cartera_colocada > 0:
            scores.append(calcular_score(
                i.barrio.densidad_poblacional_inec, anterior.total_potenciales_socios,
                anterior.monto_cartera_colocada, anterior.indice_morosidad_porcentaje, p))
            crecimientos.append(round(i.monto_cartera_colocada / anterior.monto_cartera_colocada - 1, 4))
        anterior = i
    spearman = None
    if len(scores) >= MIN_OBSERVACIONES:
        try:
            spearman = round(correlation(_rangos(scores), _rangos(crecimientos)), 4)
        except StatisticsError:  # una de las series no varía
            pass
    return {
        'observaciones': len(scores),
        'correlacion_spearman': spearman,
        'nota': ('Correlación entre el score de un corte y el crecimiento de cartera del corte siguiente.'
                 if spearman is not None else
                 'Historia insuficiente o sin variación para validar estadísticamente el score.'),
    }


def proyectar(filtros, limite=None):
    p = obtener_parametros()
    indicadores = filtrar_indicadores(filtros)
    promedio = _creditos_promedio(indicadores)
    ranking = []
    for i in indicadores:
        barrio = i.barrio
        score = calcular_score(barrio.densidad_poblacional_inec, i.total_potenciales_socios,
                               i.monto_cartera_colocada, i.indice_morosidad_porcentaje, p)
        recomendacion, detalle = recomendar(score, p)
        ranking.append({
            'barrio': barrio.pk, 'nombre_barrio': barrio.nombre_barrio, 'canton': barrio.canton,
            'agencia_nombre': barrio.agencia.nombre_agencia, 'zona_nombre': barrio.agencia.zona.nombre_zona,
            'latitud': barrio.latitud_centroide, 'longitud': barrio.longitud_centroide,
            'periodo_corte': i.periodo_corte,
            'densidad_poblacional_inec': barrio.densidad_poblacional_inec,
            'potenciales_socios': i.total_potenciales_socios,
            'indice_morosidad_porcentaje': i.indice_morosidad_porcentaje,
            'cuadrante': i.cuadrante_matriz_2x2,
            'score_crecimiento': score,
            'demanda_proyectada': round(i.total_potenciales_socios * promedio[i.barrio_id] * score / 100, 2),
            'recomendacion': recomendacion, 'detalle_recomendacion': detalle,
        })
    ranking.sort(key=lambda f: (-f['score_crecimiento'], -f['demanda_proyectada'], f['barrio']))
    for posicion, fila in enumerate(ranking, 1):
        fila['posicion'] = posicion
    return {
        'total_barrios': len(ranking),
        'demanda_total_proyectada': sum((f['demanda_proyectada'] for f in ranking), Decimal(0)),
        'brigadas_prioritarias': sum(f['recomendacion'] == 'BRIGADA_PRIORITARIA' for f in ranking),
        'validacion': validar(p),
        'ranking': ranking[:limite] if limite else ranking,
    }
