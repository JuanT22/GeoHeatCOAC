from django.apps import AppConfig


class GeoheatConfig(AppConfig):
    name = 'geoheat'
    verbose_name = 'GeoHeat COAC'

    def ready(self):
        from . import signals  # noqa: F401
