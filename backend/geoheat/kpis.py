"""Consolidación de KPIs para el dashboard y el mapa de calor (RF-005 a RF-008)."""
from decimal import Decimal

from django.db.models import OuterRef, Subquery

from .models import Cuadrante2x2, HojaRutaSemanal, IndicadorBarrio, ParametroAnalitico, PotencialSocio

FILTROS_DIRECTOS = {
    'zona': 'barrio__agencia__zona_id',
    'agencia': 'barrio__agencia_id',
    'barrio': 'barrio_id',
    'canton': 'barrio__canton__iexact',
    'parroquia': 'barrio__parroquia__iexact',
    'cuadrante': 'cuadrante_matriz_2x2',
}

def filtrar_indicadores(filtros):
    """Lista con un único indicador por barrio: el del período pedido o el más reciente."""
    qs = IndicadorBarrio.objects.order_by()
    if filtros.get('periodo'):
        qs = qs.filter(periodo_corte=filtros['periodo'])
    else:
        ultimo = (IndicadorBarrio.objects.filter(barrio=OuterRef('barrio'))
                  .order_by('-periodo_corte').values('periodo_corte')[:1])
        qs = qs.filter(periodo_corte=Subquery(ultimo))
    qs = qs.filter(**{campo: filtros[f] for f, campo in FILTROS_DIRECTOS.items() if f in filtros})
    if 'oficial_credito' in filtros:
        qs = qs.filter(barrio__in=HojaRutaSemanal.objects.order_by().filter(
            oficial_credito__iexact=filtros['oficial_credito']).values('barrio'))
    if 'actividad_economica' in filtros:
        qs = qs.filter(barrio__in=PotencialSocio.objects.order_by().filter(
            actividad_economica=filtros['actividad_economica']).values('barrio'))
    # prefetch y no select_related: con 1.852 barrios, el plan de MySQL con JOIN supera la meta de RNF-002.
    return list(qs.prefetch_related('barrio__agencia__zona'))


def _consolidar(indicadores):
    barrios = len(indicadores)
    creditos = sum(i.numero_creditos_activos for i in indicadores)
    colocada = sum((i.monto_cartera_colocada for i in indicadores), Decimal(0))
    vencida = sum((i.monto_cartera_vencida for i in indicadores), Decimal(0))
    return {
        'total_barrios': barrios,
        'cartera_total_colocada': colocada,
        'cartera_total_vencida': vencida,
        'numero_creditos': creditos,
        'promedio_creditos_por_barrio': round(Decimal(creditos) / barrios, 2) if barrios else Decimal(0),
        'cartera_promedio_por_barrio': round(colocada / barrios, 2) if barrios else Decimal(0),
        'indice_morosidad_porcentaje': IndicadorBarrio.calcular_morosidad(colocada, vencida),
        'total_socios_activos': sum(i.total_socios_activos for i in indicadores),
        'total_potenciales_socios': sum(i.total_potenciales_socios for i in indicadores),
    }


def resumen(filtros):
    indicadores = filtrar_indicadores(filtros)
    indicadores.sort(key=lambda i: (i.barrio.nombre_barrio, i.barrio_id))
    prospectos = PotencialSocio.objects.filter(barrio__in=[i.barrio_id for i in indicadores])
    if 'actividad_economica' in filtros:
        prospectos = prospectos.filter(actividad_economica=filtros['actividad_economica'])

    distribucion = dict.fromkeys(Cuadrante2x2.values, 0)
    por_zona = {}
    for i in indicadores:
        distribucion[i.cuadrante_matriz_2x2] += 1
        por_zona.setdefault(i.barrio.agencia.zona, []).append(i)
    base = dict(ParametroAnalitico.objects.filter(clave_parametro__startswith='LINEA_BASE_')
                .values_list('clave_parametro', 'valor_numerico'))
    return {
        **_consolidar(indicadores),
        'potenciales_registrados': prospectos.count(),
        'distribucion_matriz_2x2': distribucion,
        'por_zona': [
            {'zona': zona.pk, 'zona_nombre': zona.nombre_zona, **_consolidar(grupo)}
            for zona, grupo in sorted(por_zona.items(), key=lambda par: par[0].codigo_zona)],
        'linea_base': {
            'cartera_total': base.get('LINEA_BASE_CARTERA'),
            'numero_creditos': base.get('LINEA_BASE_CREDITOS'),
            'total_barrios': base.get('LINEA_BASE_BARRIOS'),
        },
        'puntos_mapa_calor': [{
            'barrio': i.barrio_id,
            'nombre_barrio': i.barrio.nombre_barrio,
            'agencia_nombre': i.barrio.agencia.nombre_agencia,
            'zona_nombre': i.barrio.agencia.zona.nombre_zona,
            'canton': i.barrio.canton,
            'latitud': i.barrio.latitud_centroide,
            'longitud': i.barrio.longitud_centroide,
            'periodo_corte': i.periodo_corte,
            'cartera_colocada': i.monto_cartera_colocada,
            'numero_creditos': i.numero_creditos_activos,
            'indice_morosidad_porcentaje': i.indice_morosidad_porcentaje,
            'potenciales_socios': i.total_potenciales_socios,
            'densidad_poblacional_inec': i.barrio.densidad_poblacional_inec,
            'cuadrante': i.cuadrante_matriz_2x2,
        } for i in indicadores],
    }
