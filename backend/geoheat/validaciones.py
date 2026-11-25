"""Reglas de negocio compartidas por los modelos (clean) y los serializadores (validate).

Cada función devuelve un diccionario {campo: mensaje}; vacío significa válido.
"""
from decimal import Decimal

from django.utils import timezone

LATITUD_MIN, LATITUD_MAX = Decimal('-5.0'), Decimal('1.5')
LONGITUD_MIN, LONGITUD_MAX = Decimal('-92.0'), Decimal('-75.0')
MSG_LATITUD = 'La latitud debe estar entre -5.0 y 1.5 (territorio ecuatoriano).'
MSG_LONGITUD = 'La longitud debe estar entre -92.0 y -75.0 (territorio ecuatoriano).'


def normalizar_nombre(texto):
    """Homologa espacios y mayúsculas iniciales de nombres geográficos (RF-004)."""
    menores = {'de', 'del', 'la', 'las', 'los', 'el', 'y'}
    return ' '.join(
        p.lower() if i and p.lower() in menores else p[:1].upper() + p[1:].lower()
        for i, p in enumerate(texto.split()))


def errores_indicador(colocada, vencida):
    if colocada is not None and vencida is not None and vencida > colocada:
        return {'monto_cartera_vencida': 'La cartera vencida no puede superar la cartera colocada.'}
    return {}


def errores_carga(leidas, validas, con_error, estado):
    errores = {}
    if None not in (leidas, validas, con_error) and validas + con_error > leidas:
        errores['filas_validas'] = (
            'La suma de filas válidas y filas con error no puede superar el total de filas leídas.'
        )
    if estado == 'PROCESADO' and con_error:
        errores['estado_procesamiento'] = (
            'Una carga con filas con error debe quedar CON_OBSERVACIONES o FALLIDO.'
        )
    return errores


def errores_hoja_ruta(agencia, barrio, semana, fecha, estado):
    errores = {}
    if agencia and barrio and barrio.agencia_id != agencia.pk:
        errores['agencia'] = f'El barrio "{barrio.nombre_barrio}" no pertenece a la agencia seleccionada.'
    if semana and fecha and fecha.isocalendar().week != semana:
        errores['semana_numero'] = (
            f'La fecha programada corresponde a la semana {fecha.isocalendar().week} del año.'
        )
    if fecha and estado == 'CUMPLIDA' and fecha > timezone.localdate():
        errores['estado'] = 'No se puede marcar como CUMPLIDA una visita con fecha futura.'
    return errores
