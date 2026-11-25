from decimal import ROUND_HALF_UP, Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from . import etl, validaciones as v
from .models import (
    Agencia, ArchivoCargaCSV, Barrio, BitacoraAuditoria, Cuadrante2x2, HojaRutaSemanal,
    IndicadorBarrio, ParametroAnalitico, PerfilUsuario, PotencialSocio, ZonaComercial,
)


class CoordenadaField(serializers.DecimalField):
    """Redondea a 6 decimales: los GPS entregan más precisión que la almacenada."""

    def __init__(self, minimo, maximo, mensaje, **kwargs):
        super().__init__(
            max_digits=9, decimal_places=6, min_value=minimo, max_value=maximo,
            error_messages={'min_value': mensaje, 'max_value': mensaje}, **kwargs)

    def validate_precision(self, value):
        if abs(value) < 1000:
            value = value.quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
        return super().validate_precision(value)


class LatitudField(CoordenadaField):
    def __init__(self, **kwargs):
        super().__init__(v.LATITUD_MIN, v.LATITUD_MAX, v.MSG_LATITUD, **kwargs)


class LongitudField(CoordenadaField):
    def __init__(self, **kwargs):
        super().__init__(v.LONGITUD_MIN, v.LONGITUD_MAX, v.MSG_LONGITUD, **kwargs)


class ReglasNegocioMixin:
    """Ayuda a que validate() funcione igual en POST, PUT y PATCH."""

    def valor(self, attrs, campo):
        if campo in attrs:
            return attrs[campo]
        return getattr(self.instance, campo, None) if self.instance else None

    def aplicar(self, errores):
        if errores:
            raise serializers.ValidationError(errores)


class ZonaComercialSerializer(serializers.ModelSerializer):
    total_agencias = serializers.IntegerField(source='agencias.count', read_only=True)

    class Meta:
        model = ZonaComercial
        fields = ['id', 'codigo_zona', 'nombre_zona', 'descripcion', 'total_agencias']


class AgenciaSerializer(serializers.ModelSerializer):
    latitud_central = LatitudField()
    longitud_central = LongitudField()
    zona_nombre = serializers.CharField(source='zona.nombre_zona', read_only=True)

    class Meta:
        model = Agencia
        fields = ['id', 'zona', 'zona_nombre', 'nombre_agencia', 'direccion',
                  'latitud_central', 'longitud_central']


class BarrioSerializer(serializers.ModelSerializer):
    latitud_centroide = LatitudField()
    longitud_centroide = LongitudField()
    agencia_nombre = serializers.CharField(source='agencia.nombre_agencia', read_only=True)
    zona = serializers.IntegerField(source='agencia.zona_id', read_only=True)
    zona_nombre = serializers.CharField(source='agencia.zona.nombre_zona', read_only=True)
    total_potenciales_registrados = serializers.SerializerMethodField()

    class Meta:
        model = Barrio
        fields = ['id', 'agencia', 'agencia_nombre', 'zona', 'zona_nombre', 'codigo_inec', 'nombre_barrio',
                  'parroquia', 'canton', 'provincia', 'latitud_centroide', 'longitud_centroide',
                  'densidad_poblacional_inec', 'numero_familias_estimado', 'estrategia_2x2',
                  'total_potenciales_registrados']
        read_only_fields = ['estrategia_2x2']

    def get_total_potenciales_registrados(self, barrio) -> int:
        anotado = getattr(barrio, 'n_potenciales', None)
        return barrio.potenciales_socios.count() if anotado is None else anotado

    def validate_nombre_barrio(self, valor):
        return v.normalizar_nombre(valor)

    def validate_parroquia(self, valor):
        return v.normalizar_nombre(valor)

    def validate_canton(self, valor):
        return v.normalizar_nombre(valor)


class PotencialSocioSerializer(serializers.ModelSerializer):
    latitud = LatitudField()
    longitud = LongitudField()
    barrio_nombre = serializers.CharField(source='barrio.nombre_barrio', read_only=True)
    canton = serializers.CharField(source='barrio.canton', read_only=True)

    class Meta:
        model = PotencialSocio
        fields = ['id', 'barrio', 'barrio_nombre', 'canton', 'identificacion', 'nombre_completo',
                  'actividad_economica', 'latitud', 'longitud', 'direccion_referencia',
                  'monto_credito_estimado', 'origen_registro', 'fecha_registro']
        read_only_fields = ['fecha_registro']

    def validate_monto_credito_estimado(self, valor):
        if valor <= 0:
            raise serializers.ValidationError('El monto de crédito estimado debe ser mayor que cero.')
        return valor


class IndicadorBarrioSerializer(ReglasNegocioMixin, serializers.ModelSerializer):
    barrio_nombre = serializers.CharField(source='barrio.nombre_barrio', read_only=True)
    agencia_nombre = serializers.CharField(source='barrio.agencia.nombre_agencia', read_only=True)

    class Meta:
        model = IndicadorBarrio
        fields = ['id', 'barrio', 'barrio_nombre', 'agencia_nombre', 'periodo_corte',
                  'monto_cartera_colocada', 'numero_creditos_activos', 'monto_cartera_vencida',
                  'indice_morosidad_porcentaje', 'total_socios_activos', 'total_potenciales_socios',
                  'cuadrante_matriz_2x2', 'estrategia_sugerida']
        read_only_fields = ['cuadrante_matriz_2x2', 'estrategia_sugerida']

    def validate(self, attrs):
        colocada = self.valor(attrs, 'monto_cartera_colocada')
        vencida = self.valor(attrs, 'monto_cartera_vencida')
        self.aplicar(v.errores_indicador(colocada, vencida))
        cambian_montos = {'monto_cartera_colocada', 'monto_cartera_vencida'} & attrs.keys()
        if 'indice_morosidad_porcentaje' not in attrs and cambian_montos:
            attrs['indice_morosidad_porcentaje'] = IndicadorBarrio.calcular_morosidad(colocada, vencida)
        return attrs


class HojaRutaSemanalSerializer(ReglasNegocioMixin, serializers.ModelSerializer):
    agencia_nombre = serializers.CharField(source='agencia.nombre_agencia', read_only=True)
    barrio_nombre = serializers.CharField(source='barrio.nombre_barrio', read_only=True)

    class Meta:
        model = HojaRutaSemanal
        fields = ['id', 'agencia', 'agencia_nombre', 'barrio', 'barrio_nombre', 'oficial_credito',
                  'semana_numero', 'fecha_programada', 'tipo_gestion', 'estado', 'observaciones']

    def validate(self, attrs):
        self.aplicar(v.errores_hoja_ruta(*(
            self.valor(attrs, c) for c in ('agencia', 'barrio', 'semana_numero', 'fecha_programada', 'estado'))))
        return attrs


class ArchivoCargaCSVSerializer(ReglasNegocioMixin, serializers.ModelSerializer):
    class Meta:
        model = ArchivoCargaCSV
        fields = ['id', 'nombre_archivo', 'tipo_dataset', 'total_filas_leidas', 'filas_validas',
                  'filas_con_error', 'estado_procesamiento', 'detalle_errores', 'fecha_carga']
        read_only_fields = ['fecha_carga']

    def validate(self, attrs):
        con_error = self.valor(attrs, 'filas_con_error') or 0
        self.aplicar(v.errores_carga(
            self.valor(attrs, 'total_filas_leidas'), self.valor(attrs, 'filas_validas'),
            con_error, self.valor(attrs, 'estado_procesamiento')))
        return attrs


class ParametroAnaliticoSerializer(ReglasNegocioMixin, serializers.ModelSerializer):
    class Meta:
        model = ParametroAnalitico
        fields = ['id', 'clave_parametro', 'descripcion', 'valor_numerico', 'actualizado']
        read_only_fields = ['actualizado']

    def validate(self, attrs):
        clave = self.valor(attrs, 'clave_parametro') or ''
        valor = self.valor(attrs, 'valor_numerico')
        if clave.startswith('UMBRAL_') and valor is not None and valor > 100:
            self.aplicar({'valor_numerico': 'Los umbrales de la Matriz 2x2 van de 0 a 100.'})
        if clave.startswith('PESO_') and valor is not None and valor > 1:
            self.aplicar({'valor_numerico': 'Los pesos analíticos van de 0 a 1.'})
        return attrs


class BitacoraAuditoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = BitacoraAuditoria
        fields = ['id', 'usuario_responsable', 'tipo_evento', 'entidad_afectada', 'detalle_cambio', 'fecha_hora']
        read_only_fields = ['fecha_hora']


class UsuarioSerializer(serializers.ModelSerializer):
    """Cuenta y perfil en un solo recurso plano (RF-013)."""
    username = serializers.CharField(
        source='usuario.username', max_length=150, validators=[UnicodeUsernameValidator()])
    email = serializers.EmailField(source='usuario.email', max_length=254)
    first_name = serializers.CharField(source='usuario.first_name', max_length=150)
    last_name = serializers.CharField(source='usuario.last_name', max_length=150)
    is_active = serializers.BooleanField(source='usuario.is_active', default=True)
    password = serializers.CharField(
        source='usuario.password', write_only=True, required=False, trim_whitespace=False,
        style={'input_type': 'password'}, help_text='Obligatoria al crear; opcional al modificar.')
    rol_nombre = serializers.CharField(source='get_rol_display', read_only=True)
    agencia_nombre = serializers.CharField(source='agencia.nombre_agencia', read_only=True, default=None)
    esta_bloqueado = serializers.BooleanField(read_only=True)

    class Meta:
        model = PerfilUsuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'password', 'rol',
                  'rol_nombre', 'agencia', 'agencia_nombre', 'intentos_fallidos', 'bloqueado_hasta',
                  'esta_bloqueado']
        read_only_fields = ['intentos_fallidos', 'bloqueado_hasta']

    def _existe(self, **filtro):
        otros = get_user_model().objects.filter(**filtro)
        if self.instance:
            otros = otros.exclude(pk=self.instance.usuario_id)
        return otros.exists()

    def validate_username(self, valor):
        if self._existe(username__iexact=valor):
            raise serializers.ValidationError('Ya existe un usuario con este nombre.')
        return valor

    def validate_email(self, valor):
        if self._existe(email__iexact=valor):
            raise serializers.ValidationError('Ya existe un usuario con este correo.')
        return valor

    def validate(self, attrs):
        datos = attrs.get('usuario', {})
        if 'password' not in datos:
            if self.instance is None:
                raise serializers.ValidationError({'password': 'La contraseña es obligatoria.'})
            return attrs
        User = get_user_model()
        propuesto = User(**{
            c: datos.get(c, getattr(self.instance.usuario, c) if self.instance else '')
            for c in ('username', 'email', 'first_name', 'last_name')})
        try:
            validate_password(datos['password'], propuesto)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': exc.messages}) from exc
        return attrs

    def _aplicar(self, usuario, datos):
        clave = datos.pop('password', None)
        for campo, valor in datos.items():
            setattr(usuario, campo, valor)
        if clave is not None:
            usuario.set_password(clave)
        usuario.save()

    @transaction.atomic
    def create(self, validated_data):
        usuario = get_user_model()()  # nunca staff ni superusuario por esta vía
        self._aplicar(usuario, validated_data.pop('usuario'))
        return PerfilUsuario.objects.create(usuario=usuario, **validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        datos = validated_data.pop('usuario', {})
        if datos:
            self._aplicar(instance.usuario, datos)
        return super().update(instance, validated_data)


# --- Procesamiento de CSV ---------------------------------------------------------

class ProcesarCSVSerializer(serializers.Serializer):
    """Un archivo .csv (multipart) o su contenido como texto."""
    TAMANO_MAXIMO = 20 * 1024 * 1024

    archivo = serializers.FileField(required=False, help_text='Archivo .csv en UTF-8.')
    contenido = serializers.CharField(required=False, trim_whitespace=False, help_text='Texto CSV.')
    nombre_archivo = serializers.RegexField(r'(?i)\.csv$', required=False, max_length=200, error_messages={
        'invalid': 'El archivo debe tener extensión .csv.'})
    periodo_corte = serializers.DateField(
        required=False, help_text='Corte de las filas sin columna periodo_corte. Por defecto, hoy.')

    def validate_periodo_corte(self, valor):
        if valor > timezone.localdate():
            raise serializers.ValidationError('El período de corte no puede ser una fecha futura.')
        return valor

    def validate_archivo(self, archivo):
        if not archivo.name.lower().endswith('.csv'):
            raise serializers.ValidationError('El archivo debe tener extensión .csv.')
        if len(archivo.name) > 200:
            raise serializers.ValidationError('El nombre del archivo supera 200 caracteres.')
        if archivo.size > self.TAMANO_MAXIMO:
            raise serializers.ValidationError('El archivo supera el máximo de 20 MB.')
        try:
            archivo.texto = archivo.read().decode('utf-8-sig')
        except UnicodeDecodeError as exc:
            raise serializers.ValidationError('El archivo debe estar codificado en UTF-8.') from exc
        return archivo

    def validate(self, attrs):
        archivo, contenido = attrs.get('archivo'), attrs.get('contenido')
        if (archivo is None) == (contenido is None):
            raise serializers.ValidationError({'archivo': 'Envíe un archivo .csv o el texto en "contenido".'})
        attrs['texto'] = archivo.texto if archivo else contenido
        attrs['nombre'] = archivo.name if archivo else attrs.get('nombre_archivo', 'carga_texto.csv')
        return attrs


class ResultadoCargaSerializer(ArchivoCargaCSVSerializer):
    indicadores_creados = serializers.IntegerField(read_only=True)
    indicadores_actualizados = serializers.IntegerField(read_only=True)
    barrios_creados = serializers.IntegerField(read_only=True)

    class Meta(ArchivoCargaCSVSerializer.Meta):
        fields = [*ArchivoCargaCSVSerializer.Meta.fields, 'indicadores_creados', 'indicadores_actualizados',
                  'barrios_creados']


class EstructuraInvalidaSerializer(serializers.Serializer):
    detail = serializers.CharField()
    columnas_faltantes = serializers.ListField(child=serializers.CharField(), required=False)
    columnas_obligatorias = serializers.ListField(child=serializers.CharField(), default=list(
        etl.COLUMNAS_OBLIGATORIAS))


# --- Supervisión de rutas (RF-011) --------------------------------------------------

class FiltroRutasSerializer(serializers.Serializer):
    agencia = serializers.IntegerField(required=False)
    oficial_credito = serializers.CharField(required=False)
    semana_numero = serializers.IntegerField(required=False, min_value=1, max_value=53)
    desde = serializers.DateField(required=False)
    hasta = serializers.DateField(required=False)

    def validate(self, attrs):
        if 'desde' in attrs and 'hasta' in attrs and attrs['desde'] > attrs['hasta']:
            raise serializers.ValidationError({'hasta': 'Debe ser igual o posterior a "desde".'})
        return attrs


class CumplimientoSerializer(serializers.Serializer):
    total_rutas = serializers.IntegerField()
    por_estado = serializers.DictField(child=serializers.IntegerField())
    porcentaje_cumplimiento = serializers.FloatField(help_text='Cumplidas / total asignadas × 100.')
    porcentaje_sobre_cerradas = serializers.FloatField(help_text='Cumplidas / (cumplidas + incumplidas) × 100.')


class CumplimientoOficialSerializer(CumplimientoSerializer):
    oficial_credito = serializers.CharField()


class CumplimientoAgenciaSerializer(CumplimientoSerializer):
    agencia = serializers.IntegerField()
    agencia_nombre = serializers.CharField()


class VisitaNoRealizadaSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    barrio = serializers.IntegerField()
    nombre_barrio = serializers.CharField()
    oficial_credito = serializers.CharField()
    fecha_programada = serializers.DateField()
    estado = serializers.ChoiceField(choices=HojaRutaSemanal.Estado.choices)


class VariacionBarrioSerializer(serializers.Serializer):
    barrio = serializers.IntegerField()
    nombre_barrio = serializers.CharField()
    periodo_anterior = serializers.DateField()
    periodo_actual = serializers.DateField()
    variacion_cartera = serializers.DecimalField(max_digits=15, decimal_places=2)
    variacion_morosidad = serializers.DecimalField(max_digits=6, decimal_places=2)


class ReporteCumplimientoSerializer(CumplimientoSerializer):
    por_oficial = CumplimientoOficialSerializer(many=True)
    por_agencia = CumplimientoAgenciaSerializer(many=True)
    visitas_no_realizadas = VisitaNoRealizadaSerializer(many=True)
    variacion_por_barrio = VariacionBarrioSerializer(many=True)


# --- resumen-kpis ---------------------------------------------------------------

class FiltroKpiSerializer(serializers.Serializer):
    """Filtros del dashboard (RF-007)."""
    periodo = serializers.DateField(
        required=False, help_text='Fecha de corte. Por defecto, el último corte de cada barrio.')
    zona = serializers.IntegerField(required=False)
    agencia = serializers.IntegerField(required=False)
    barrio = serializers.IntegerField(required=False)
    canton = serializers.CharField(required=False)
    parroquia = serializers.CharField(required=False)
    oficial_credito = serializers.CharField(required=False)
    actividad_economica = serializers.ChoiceField(
        required=False, choices=PotencialSocio.ActividadEconomica.choices)
    cuadrante = serializers.ChoiceField(required=False, choices=Cuadrante2x2.choices)


class KpisBaseSerializer(serializers.Serializer):
    total_barrios = serializers.IntegerField()
    cartera_total_colocada = serializers.DecimalField(max_digits=20, decimal_places=2)
    cartera_total_vencida = serializers.DecimalField(max_digits=20, decimal_places=2)
    numero_creditos = serializers.IntegerField()
    promedio_creditos_por_barrio = serializers.DecimalField(max_digits=14, decimal_places=2)
    cartera_promedio_por_barrio = serializers.DecimalField(max_digits=20, decimal_places=2)
    indice_morosidad_porcentaje = serializers.DecimalField(max_digits=5, decimal_places=2)
    total_socios_activos = serializers.IntegerField()
    total_potenciales_socios = serializers.IntegerField()


class KpisZonaSerializer(KpisBaseSerializer):
    zona = serializers.IntegerField()
    zona_nombre = serializers.CharField()


class PuntoMapaCalorSerializer(serializers.Serializer):
    barrio = serializers.IntegerField()
    nombre_barrio = serializers.CharField()
    agencia_nombre = serializers.CharField()
    zona_nombre = serializers.CharField()
    canton = serializers.CharField()
    latitud = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitud = serializers.DecimalField(max_digits=9, decimal_places=6)
    periodo_corte = serializers.DateField()
    cartera_colocada = serializers.DecimalField(max_digits=14, decimal_places=2)
    numero_creditos = serializers.IntegerField()
    indice_morosidad_porcentaje = serializers.DecimalField(max_digits=5, decimal_places=2)
    potenciales_socios = serializers.IntegerField()
    densidad_poblacional_inec = serializers.DecimalField(max_digits=10, decimal_places=2)
    cuadrante = serializers.ChoiceField(choices=Cuadrante2x2.choices)


class LineaBaseSerializer(serializers.Serializer):
    """Referencia institucional (RF-008); null si el parámetro no está cargado."""
    cartera_total = serializers.DecimalField(max_digits=16, decimal_places=4, allow_null=True)
    numero_creditos = serializers.DecimalField(max_digits=16, decimal_places=4, allow_null=True)
    total_barrios = serializers.DecimalField(max_digits=16, decimal_places=4, allow_null=True)


class ResumenKpisSerializer(KpisBaseSerializer):
    potenciales_registrados = serializers.IntegerField()
    distribucion_matriz_2x2 = serializers.DictField(child=serializers.IntegerField())
    por_zona = KpisZonaSerializer(many=True)
    linea_base = LineaBaseSerializer()
    puntos_mapa_calor = PuntoMapaCalorSerializer(many=True)


# --- Proyección de expansión (RF-012) -------------------------------------------------

class FiltroProyeccionSerializer(FiltroKpiSerializer):
    limite = serializers.IntegerField(required=False, min_value=1, help_text='Primeros N barrios del ranking.')


class ProyeccionBarrioSerializer(serializers.Serializer):
    posicion = serializers.IntegerField()
    barrio = serializers.IntegerField()
    nombre_barrio = serializers.CharField()
    canton = serializers.CharField()
    agencia_nombre = serializers.CharField()
    zona_nombre = serializers.CharField()
    latitud = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitud = serializers.DecimalField(max_digits=9, decimal_places=6)
    periodo_corte = serializers.DateField()
    densidad_poblacional_inec = serializers.DecimalField(max_digits=10, decimal_places=2)
    potenciales_socios = serializers.IntegerField()
    indice_morosidad_porcentaje = serializers.DecimalField(max_digits=5, decimal_places=2)
    cuadrante = serializers.ChoiceField(choices=Cuadrante2x2.choices)
    score_crecimiento = serializers.DecimalField(max_digits=5, decimal_places=2)
    demanda_proyectada = serializers.DecimalField(max_digits=26, decimal_places=2)
    recomendacion = serializers.ChoiceField(choices=[
        'BRIGADA_PRIORITARIA', 'BRIGADA_PROGRAMADA', 'SEGUIMIENTO'])
    detalle_recomendacion = serializers.CharField()


class ValidacionScoreSerializer(serializers.Serializer):
    observaciones = serializers.IntegerField()
    correlacion_spearman = serializers.FloatField(allow_null=True)
    nota = serializers.CharField()


class ProyeccionExpansionSerializer(serializers.Serializer):
    total_barrios = serializers.IntegerField()
    demanda_total_proyectada = serializers.DecimalField(max_digits=30, decimal_places=2)
    brigadas_prioritarias = serializers.IntegerField()
    validacion = ValidacionScoreSerializer()
    ranking = ProyeccionBarrioSerializer(many=True)
