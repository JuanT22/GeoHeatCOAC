import csv

from django.db import transaction
from django.db.models import Count, ProtectedError
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ParseError
from rest_framework.parsers import BaseParser, FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from . import auditoria, etl, kpis, prediccion, supervision
from . import serializers as s
from .models import (
    Agencia, ArchivoCargaCSV, Barrio, BitacoraAuditoria, HojaRutaSemanal, IndicadorBarrio,
    ParametroAnalitico, PerfilUsuario, PotencialSocio, ZonaComercial,
)


class TextoCSVParser(BaseParser):
    """Permite enviar el CSV directamente como cuerpo text/csv."""
    media_type = 'text/csv'

    def parse(self, stream, media_type=None, parser_context=None):
        try:
            return {'contenido': stream.read().decode('utf-8-sig')}
        except UnicodeDecodeError as exc:
            raise ParseError('El CSV debe estar codificado en UTF-8.') from exc


class AuditadoViewSet(viewsets.ModelViewSet):
    """CRUD completo que deja constancia de cada escritura en la bitácora (RF-014)."""

    @transaction.atomic
    def perform_create(self, serializer):
        instancia = serializer.save()
        auditoria.registrar(self.request, auditoria.Evento.CREACION, instancia)

    @transaction.atomic
    def perform_update(self, serializer):
        antes = auditoria.valores(serializer.instance)
        instancia = serializer.save()
        detalle = auditoria.describir_cambios(antes, auditoria.valores(instancia))
        auditoria.registrar(self.request, auditoria.Evento.MODIFICACION, instancia, detalle)

    @transaction.atomic
    def perform_destroy(self, instance):
        pk = instance.pk
        instance.delete()
        auditoria.registrar(self.request, auditoria.Evento.ELIMINACION, instance, pk=pk)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError as exc:
            entidades = sorted({str(o._meta.verbose_name_plural) for o in exc.protected_objects})
            return Response(
                {'detail': f'No se puede eliminar: existen {", ".join(entidades)} asociados.'},
                status=status.HTTP_400_BAD_REQUEST)


class ZonaComercialViewSet(AuditadoViewSet):
    queryset = ZonaComercial.objects.prefetch_related('agencias')
    serializer_class = s.ZonaComercialSerializer
    filterset_fields = ['codigo_zona']
    search_fields = ['codigo_zona', 'nombre_zona', 'descripcion']
    ordering_fields = ['codigo_zona', 'nombre_zona']


class AgenciaViewSet(AuditadoViewSet):
    queryset = Agencia.objects.select_related('zona')
    serializer_class = s.AgenciaSerializer
    filterset_fields = ['zona']
    search_fields = ['nombre_agencia', 'direccion', 'zona__nombre_zona']
    ordering_fields = ['nombre_agencia', 'zona__codigo_zona']


class BarrioViewSet(AuditadoViewSet):
    queryset = (Barrio.objects.select_related('agencia__zona')
                .annotate(n_potenciales=Count('potenciales_socios')).order_by('nombre_barrio', 'id'))
    serializer_class = s.BarrioSerializer
    filterset_fields = ['agencia', 'agencia__zona', 'canton', 'parroquia', 'provincia', 'estrategia_2x2']
    search_fields = ['nombre_barrio', 'codigo_inec', 'parroquia', 'canton']
    ordering_fields = ['nombre_barrio', 'canton', 'densidad_poblacional_inec', 'numero_familias_estimado']


class PotencialSocioViewSet(AuditadoViewSet):
    queryset = PotencialSocio.objects.select_related('barrio')
    serializer_class = s.PotencialSocioSerializer
    filterset_fields = ['barrio', 'barrio__agencia', 'actividad_economica', 'origen_registro']
    search_fields = ['identificacion', 'nombre_completo', 'direccion_referencia', 'barrio__nombre_barrio']
    ordering_fields = ['nombre_completo', 'monto_credito_estimado', 'fecha_registro']


class IndicadorBarrioViewSet(AuditadoViewSet):
    queryset = IndicadorBarrio.objects.select_related('barrio__agencia')
    serializer_class = s.IndicadorBarrioSerializer
    filterset_fields = {
        'barrio': ['exact'], 'barrio__agencia': ['exact'], 'barrio__agencia__zona': ['exact'],
        'periodo_corte': ['exact', 'gte', 'lte'], 'cuadrante_matriz_2x2': ['exact'],
        'indice_morosidad_porcentaje': ['gte', 'lte'],
    }
    search_fields = ['barrio__nombre_barrio', 'barrio__canton', 'estrategia_sugerida']
    ordering_fields = ['periodo_corte', 'monto_cartera_colocada', 'indice_morosidad_porcentaje',
                       'numero_creditos_activos', 'total_potenciales_socios']

    @extend_schema(
        summary='KPIs consolidados para el mapa de calor',
        parameters=[s.FiltroKpiSerializer], responses=s.ResumenKpisSerializer, filters=False)
    @action(detail=False, methods=['get'], url_path='resumen-kpis', pagination_class=None)
    def resumen_kpis(self, request):
        filtros = s.FiltroKpiSerializer(data=request.query_params.dict())
        filtros.is_valid(raise_exception=True)
        return Response(s.ResumenKpisSerializer(kpis.resumen(filtros.validated_data)).data)

    @extend_schema(
        summary='Proyección de zonas de expansión y brigadas recomendadas',
        parameters=[s.FiltroProyeccionSerializer], responses=s.ProyeccionExpansionSerializer, filters=False)
    @action(detail=False, methods=['get'], url_path='proyeccion-expansion', pagination_class=None)
    def proyeccion_expansion(self, request):
        filtros = s.FiltroProyeccionSerializer(data=request.query_params.dict())
        filtros.is_valid(raise_exception=True)
        datos = dict(filtros.validated_data)
        limite = datos.pop('limite', None)
        return Response(s.ProyeccionExpansionSerializer(prediccion.proyectar(datos, limite)).data)


class HojaRutaSemanalViewSet(AuditadoViewSet):
    queryset = HojaRutaSemanal.objects.select_related('agencia', 'barrio')
    serializer_class = s.HojaRutaSemanalSerializer
    filterset_fields = ['agencia', 'barrio', 'oficial_credito', 'semana_numero', 'tipo_gestion', 'estado',
                        'fecha_programada']
    search_fields = ['oficial_credito', 'barrio__nombre_barrio', 'agencia__nombre_agencia', 'observaciones']
    ordering_fields = ['fecha_programada', 'semana_numero', 'estado', 'oficial_credito']

    @extend_schema(
        summary='Reporte de cumplimiento de rutas por oficial y agencia',
        parameters=[s.FiltroRutasSerializer], responses=s.ReporteCumplimientoSerializer, filters=False)
    @action(detail=False, methods=['get'], url_path='reporte-cumplimiento', pagination_class=None)
    def reporte_cumplimiento(self, request):
        filtros = s.FiltroRutasSerializer(data=request.query_params.dict())
        filtros.is_valid(raise_exception=True)
        return Response(s.ReporteCumplimientoSerializer(supervision.reporte(filtros.validated_data)).data)


class ArchivoCargaCSVViewSet(AuditadoViewSet):
    queryset = ArchivoCargaCSV.objects.all()
    serializer_class = s.ArchivoCargaCSVSerializer
    filterset_fields = ['tipo_dataset', 'estado_procesamiento']
    search_fields = ['nombre_archivo', 'detalle_errores']
    ordering_fields = ['fecha_carga', 'total_filas_leidas', 'filas_con_error']

    @extend_schema(
        summary='Procesar un CSV de cartera y morosidad',
        description=f'Columnas obligatorias: {", ".join(etl.COLUMNAS_OBLIGATORIAS)}. Opcionales: periodo_corte, '
                    'socios_activos, potenciales_socios, latitud, longitud. Un código INEC desconocido se crea '
                    f'como barrio si además trae: {", ".join(etl.COLUMNAS_BARRIO_NUEVO)}.',
        request={'multipart/form-data': s.ProcesarCSVSerializer, 'application/json': s.ProcesarCSVSerializer,
                 'text/csv': OpenApiTypes.STR},
        responses={201: s.ResultadoCargaSerializer, 400: s.EstructuraInvalidaSerializer}, filters=False)
    @action(detail=False, methods=['post'], url_path='procesar',
            parser_classes=[MultiPartParser, FormParser, JSONParser, TextoCSVParser])
    def procesar(self, request):
        entrada = s.ProcesarCSVSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data
        try:
            with transaction.atomic():
                r = etl.procesar(datos['texto'], datos.get('periodo_corte'))
                carga = ArchivoCargaCSV.objects.create(
                    nombre_archivo=datos['nombre'], tipo_dataset=ArchivoCargaCSV.TipoDataset.CARTERA_MORA,
                    total_filas_leidas=r.leidas, filas_validas=r.validas, filas_con_error=len(r.errores),
                    estado_procesamiento=r.estado, detalle_errores=r.detalle)
                auditoria.registrar(
                    request, auditoria.Evento.CREACION, carga,
                    f'{r.leidas} filas leídas, {r.validas} válidas, {len(r.errores)} con error; '
                    f'{r.indicadores_creados} indicadores creados, {r.indicadores_actualizados} actualizados, '
                    f'{r.barrios_creados} barrios creados')
        except etl.EstructuraInvalida as exc:
            return Response(exc.errores, status=status.HTTP_400_BAD_REQUEST)
        for campo in ('indicadores_creados', 'indicadores_actualizados', 'barrios_creados'):
            setattr(carga, campo, getattr(r, campo))
        return Response(s.ResultadoCargaSerializer(carga).data, status=status.HTTP_201_CREATED)

    @extend_schema(summary='Descargar las filas rechazadas en CSV', filters=False,
                   responses={(200, 'text/csv'): OpenApiResponse(OpenApiTypes.STR)})
    @action(detail=True, methods=['get'], url_path='errores')
    def errores(self, request, pk=None):
        carga = self.get_object()
        respuesta = HttpResponse(content_type='text/csv; charset=utf-8')
        respuesta['Content-Disposition'] = f'attachment; filename="observaciones_carga_{carga.pk}.csv"'
        escritor = csv.writer(respuesta)
        escritor.writerow(['observacion'])
        escritor.writerows([linea] for linea in carga.detalle_errores.splitlines())
        return respuesta


class ParametroAnaliticoViewSet(AuditadoViewSet):
    queryset = ParametroAnalitico.objects.all()
    serializer_class = s.ParametroAnaliticoSerializer
    filterset_fields = ['clave_parametro']
    search_fields = ['clave_parametro', 'descripcion']
    ordering_fields = ['clave_parametro', 'valor_numerico', 'actualizado']


class BitacoraAuditoriaViewSet(AuditadoViewSet):
    queryset = BitacoraAuditoria.objects.all()
    serializer_class = s.BitacoraAuditoriaSerializer
    filterset_fields = {
        'usuario_responsable': ['exact'], 'tipo_evento': ['exact'], 'entidad_afectada': ['exact'],
        'fecha_hora': ['gte', 'lte'],
    }
    search_fields = ['usuario_responsable', 'entidad_afectada', 'detalle_cambio']
    ordering_fields = ['fecha_hora', 'tipo_evento', 'usuario_responsable']


class UsuarioViewSet(AuditadoViewSet):
    """Usuarios y roles (RF-013). Las cuentas staff/superusuario solo se gestionan en /admin/."""
    queryset = (PerfilUsuario.objects.select_related('usuario', 'agencia')
                .filter(usuario__is_staff=False, usuario__is_superuser=False))
    serializer_class = s.UsuarioSerializer
    filterset_fields = ['rol', 'agencia', 'usuario__is_active']
    search_fields = ['usuario__username', 'usuario__email', 'usuario__first_name', 'usuario__last_name']
    ordering_fields = ['usuario__username', 'rol']

    @transaction.atomic
    def perform_destroy(self, instance):
        pk = instance.pk
        detalle = f'usuario {instance.usuario.get_username()}'
        instance.usuario.delete()  # elimina también el perfil en cascada
        auditoria.registrar(self.request, auditoria.Evento.ELIMINACION, instance, detalle, pk=pk)
