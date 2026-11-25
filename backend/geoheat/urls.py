from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views
from .autenticacion import LoginView

router = DefaultRouter()
router.register('zonas', views.ZonaComercialViewSet)
router.register('agencias', views.AgenciaViewSet)
router.register('barrios', views.BarrioViewSet)
router.register('potenciales-socios', views.PotencialSocioViewSet)
router.register('indicadores', views.IndicadorBarrioViewSet)
router.register('hojas-ruta', views.HojaRutaSemanalViewSet)
router.register('cargas-csv', views.ArchivoCargaCSVViewSet)
router.register('parametros', views.ParametroAnaliticoViewSet)
router.register('bitacora', views.BitacoraAuditoriaViewSet)
router.register('usuarios', views.UsuarioViewSet)

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('rutas/reporte-cumplimiento/',
         views.HojaRutaSemanalViewSet.as_view({'get': 'reporte_cumplimiento'}), name='reporte-cumplimiento'),
    *router.urls,
]
