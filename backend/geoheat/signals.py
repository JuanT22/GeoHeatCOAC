"""Mantienen la Matriz 2x2 al día sin reiniciar el servidor (RF-009, RF-013)."""
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from . import matriz
from .models import Barrio, IndicadorBarrio, ParametroAnalitico


@receiver([post_save, post_delete], sender=ParametroAnalitico)
def recalcular_por_parametro(instance, raw=False, **kwargs):
    if not raw:
        matriz.recalcular()


@receiver(post_save, sender=Barrio)
def recalcular_por_densidad(instance, created, raw=False, **kwargs):
    if not raw and not created:
        matriz.recalcular(instance.indicadores.all())
        instance.refresh_from_db(fields=['estrategia_2x2'])


@receiver(post_delete, sender=IndicadorBarrio)
def sincronizar_al_eliminar(instance, **kwargs):
    matriz.sincronizar_barrios([instance.barrio_id])
