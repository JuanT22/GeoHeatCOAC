"""Reporte de cumplimiento de hojas de ruta e impacto comercial (RF-011, CU-007)."""
from django.db.models import Count, F, Q
from django.utils import timezone

from .models import HojaRutaSemanal, IndicadorBarrio

Estado = HojaRutaSemanal.Estado
FILTROS = {
    'agencia': 'agencia_id',
    'oficial_credito': 'oficial_credito__iexact',
    'semana_numero': 'semana_numero',
    'desde': 'fecha_programada__gte',
    'hasta': 'fecha_programada__lte',
}
CONTEOS = {'total': Count('id'), **{e: Count('id', filter=Q(estado=e)) for e in Estado.values}}


def _resumen(conteos):
    cumplidas, total = conteos[Estado.CUMPLIDA], conteos['total']
    cerradas = cumplidas + conteos[Estado.INCUMPLIDA]
    return {
        'total_rutas': total,
        'por_estado': {e: conteos[e] for e in Estado.values},
        'porcentaje_cumplimiento': round(cumplidas * 100 / total, 2) if total else 0,
        'porcentaje_sobre_cerradas': round(cumplidas * 100 / cerradas, 2) if cerradas else 0,
    }


def _variaciones(barrio_ids):
    """Cambio de cartera y morosidad entre los dos últimos cortes de cada barrio visitado."""
    ultimos = {}
    for i in (IndicadorBarrio.objects.filter(barrio__in=barrio_ids).select_related('barrio')
              .order_by('barrio__nombre_barrio', 'barrio_id', '-periodo_corte')):
        cortes = ultimos.setdefault(i.barrio_id, [])
        if len(cortes) < 2:
            cortes.append(i)
    return [{
        'barrio': actual.barrio_id, 'nombre_barrio': actual.barrio.nombre_barrio,
        'periodo_anterior': anterior.periodo_corte, 'periodo_actual': actual.periodo_corte,
        'variacion_cartera': actual.monto_cartera_colocada - anterior.monto_cartera_colocada,
        'variacion_morosidad': actual.indice_morosidad_porcentaje - anterior.indice_morosidad_porcentaje,
    } for actual, anterior in (c for c in ultimos.values() if len(c) == 2)]


def reporte(filtros):
    rutas = HojaRutaSemanal.objects.order_by().filter(
        **{campo: filtros[f] for f, campo in FILTROS.items() if f in filtros})
    # Al cierre, una visita no realizada se resalta aunque nadie la haya marcado (CU-005, 4a).
    no_visitadas = rutas.filter(
        Q(estado=Estado.INCUMPLIDA)
        | Q(estado__in=[Estado.PENDIENTE, Estado.EN_CURSO], fecha_programada__lt=timezone.localdate()))
    return {
        **_resumen(rutas.aggregate(**CONTEOS)),
        'por_oficial': [
            {'oficial_credito': f['oficial_credito'], **_resumen(f)}
            for f in rutas.values('oficial_credito').annotate(**CONTEOS).order_by('oficial_credito')],
        'por_agencia': [
            {'agencia': f['agencia_id'], 'agencia_nombre': f['agencia_nombre'], **_resumen(f)}
            for f in rutas.values('agencia_id', agencia_nombre=F('agencia__nombre_agencia'))
            .annotate(**CONTEOS).order_by('agencia__nombre_agencia')],
        'visitas_no_realizadas': [{
            'id': h.pk, 'barrio': h.barrio_id, 'nombre_barrio': h.barrio.nombre_barrio,
            'oficial_credito': h.oficial_credito, 'fecha_programada': h.fecha_programada, 'estado': h.estado,
        } for h in no_visitadas.select_related('barrio').order_by('fecha_programada', 'id')],
        'variacion_por_barrio': _variaciones(rutas.filter(estado=Estado.CUMPLIDA).values('barrio')),
    }
