from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import (
    MaxValueValidator, MinLengthValidator, MinValueValidator, RegexValidator,
)
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from . import matriz, validaciones as v


class Cuadrante2x2(models.TextChoices):
    VISITAS_FRECUENTES = 'VISITAS_FRECUENTES', 'Visitas frecuentes'
    REFORZAR_POSICION = 'REFORZAR_POSICION', 'Reforzar posición'
    VISITAS_MODERADAS = 'VISITAS_MODERADAS', 'Visitas moderadas'
    VISITAS_MINIMAS = 'VISITAS_MINIMAS', 'Visitas mínimas'


class Provincia(models.TextChoices):
    """Provincias dentro de la cobertura de la cooperativa (RF-002)."""
    LOJA = 'Loja', 'Loja'
    ZAMORA_CHINCHIPE = 'Zamora Chinchipe', 'Zamora Chinchipe'
    EL_ORO = 'El Oro', 'El Oro'


def campo_latitud():
    return models.DecimalField(max_digits=9, decimal_places=6, validators=[
        MinValueValidator(v.LATITUD_MIN, v.MSG_LATITUD), MaxValueValidator(v.LATITUD_MAX, v.MSG_LATITUD),
    ])


def campo_longitud():
    return models.DecimalField(max_digits=9, decimal_places=6, validators=[
        MinValueValidator(v.LONGITUD_MIN, v.MSG_LONGITUD), MaxValueValidator(v.LONGITUD_MAX, v.MSG_LONGITUD),
    ])


def campo_monto(nombre):
    return models.DecimalField(
        nombre, max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])


class ZonaComercial(models.Model):
    codigo_zona = models.CharField('código de zona', max_length=10, unique=True)
    nombre_zona = models.CharField('nombre de zona', max_length=100, validators=[MinLengthValidator(3)])
    descripcion = models.TextField('descripción', blank=True)

    class Meta:
        verbose_name = 'zona comercial'
        verbose_name_plural = 'zonas comerciales'
        ordering = ['codigo_zona']

    def __str__(self):
        return self.nombre_zona


class Agencia(models.Model):
    zona = models.ForeignKey(ZonaComercial, on_delete=models.PROTECT, related_name='agencias')
    nombre_agencia = models.CharField('nombre de agencia', max_length=100, validators=[MinLengthValidator(3)])
    direccion = models.CharField('dirección', max_length=200)
    latitud_central = campo_latitud()
    longitud_central = campo_longitud()

    class Meta:
        ordering = ['nombre_agencia']
        constraints = [
            models.UniqueConstraint(fields=['zona', 'nombre_agencia'], name='agencia_unica_por_zona'),
        ]

    def __str__(self):
        return self.nombre_agencia


class Barrio(models.Model):
    agencia = models.ForeignKey(Agencia, on_delete=models.PROTECT, related_name='barrios')
    codigo_inec = models.CharField('código INEC', max_length=12, unique=True, validators=[
        RegexValidator(r'^\d{6,12}$', 'El código INEC debe contener entre 6 y 12 dígitos.'),
    ])
    nombre_barrio = models.CharField('nombre de barrio', max_length=100, validators=[MinLengthValidator(3)])
    parroquia = models.CharField(max_length=100)
    canton = models.CharField('cantón', max_length=100)
    provincia = models.CharField(max_length=30, choices=Provincia.choices)
    latitud_centroide = campo_latitud()
    longitud_centroide = campo_longitud()
    densidad_poblacional_inec = models.DecimalField(
        'densidad poblacional INEC (hab/km²)', max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100000'))])
    numero_familias_estimado = models.PositiveIntegerField(
        'número de familias estimado', validators=[MaxValueValidator(1_000_000)])
    estrategia_2x2 = models.CharField(
        'estrategia 2x2', max_length=20, choices=Cuadrante2x2.choices, blank=True, editable=False,
        help_text='Se toma del indicador más reciente del barrio.')

    class Meta:
        ordering = ['nombre_barrio']

    def __str__(self):
        return f'{self.nombre_barrio} ({self.canton})'


class PotencialSocio(models.Model):
    class ActividadEconomica(models.TextChoices):
        MICROEMPRESA = 'MICROEMPRESA', 'Microempresa'
        COMERCIO = 'COMERCIO', 'Comercio'
        AGROPECUARIO = 'AGROPECUARIO', 'Agropecuario'
        SERVICIOS = 'SERVICIOS', 'Servicios'

    class OrigenRegistro(models.TextChoices):
        CAMPO = 'CAMPO', 'Registro en campo'
        CSV = 'CSV', 'Carga CSV'

    barrio = models.ForeignKey(Barrio, on_delete=models.PROTECT, related_name='potenciales_socios')
    identificacion = models.CharField('identificación', max_length=13, unique=True, validators=[
        RegexValidator(r'^(\d{10}|\d{13})$', 'La identificación debe tener 10 dígitos (cédula) o 13 (RUC).'),
    ])
    nombre_completo = models.CharField(max_length=150, validators=[MinLengthValidator(3)])
    actividad_economica = models.CharField(
        'actividad económica', max_length=20, choices=ActividadEconomica.choices)
    latitud = campo_latitud()
    longitud = campo_longitud()
    direccion_referencia = models.CharField('dirección de referencia', max_length=200, blank=True)
    monto_credito_estimado = campo_monto('monto de crédito estimado')
    origen_registro = models.CharField(
        max_length=10, choices=OrigenRegistro.choices, default=OrigenRegistro.CAMPO)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'potencial socio'
        verbose_name_plural = 'potenciales socios'
        ordering = ['-fecha_registro', '-id']

    def __str__(self):
        return self.nombre_completo


class IndicadorBarrio(models.Model):
    barrio = models.ForeignKey(Barrio, on_delete=models.CASCADE, related_name='indicadores')
    periodo_corte = models.DateField('período de corte')
    monto_cartera_colocada = campo_monto('monto de cartera colocada')
    numero_creditos_activos = models.PositiveIntegerField('número de créditos activos')
    monto_cartera_vencida = campo_monto('monto de cartera vencida')
    indice_morosidad_porcentaje = models.DecimalField(
        'índice de morosidad (%)', max_digits=5, decimal_places=2, blank=True,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        help_text='Si se omite, se calcula como cartera vencida / cartera colocada × 100.')
    total_socios_activos = models.PositiveIntegerField()
    total_potenciales_socios = models.PositiveIntegerField()
    cuadrante_matriz_2x2 = models.CharField(max_length=20, choices=Cuadrante2x2.choices, editable=False)
    estrategia_sugerida = models.CharField(max_length=255, editable=False)

    class Meta:
        verbose_name = 'indicador de barrio'
        verbose_name_plural = 'indicadores de barrio'
        ordering = ['-periodo_corte', 'barrio__nombre_barrio']
        constraints = [
            models.UniqueConstraint(fields=['barrio', 'periodo_corte'], name='indicador_unico_por_periodo'),
            models.CheckConstraint(
                condition=Q(monto_cartera_vencida__lte=F('monto_cartera_colocada')),
                name='cartera_vencida_no_supera_colocada'),
        ]

    def __str__(self):
        return f'{self.barrio} – {self.periodo_corte}'

    @staticmethod
    def calcular_morosidad(colocada, vencida):
        return round(Decimal(vencida) / Decimal(colocada) * 100, 2) if colocada else Decimal('0')

    def clean(self):
        errores = v.errores_indicador(self.monto_cartera_colocada, self.monto_cartera_vencida)
        if errores:
            raise ValidationError(errores)

    def save(self, *args, **kwargs):
        barrio_anterior = None
        if self.pk:
            barrio_anterior = type(self).objects.filter(pk=self.pk).values_list('barrio_id', flat=True).first()
        if self.indice_morosidad_porcentaje is None:
            self.indice_morosidad_porcentaje = self.calcular_morosidad(
                self.monto_cartera_colocada, self.monto_cartera_vencida)
        self.cuadrante_matriz_2x2, self.estrategia_sugerida = matriz.evaluar(
            self.barrio.densidad_poblacional_inec, self.total_potenciales_socios,
            self.monto_cartera_colocada, self.indice_morosidad_porcentaje, matriz.obtener_parametros(),
        )
        if kwargs.get('update_fields') is not None:
            kwargs['update_fields'] = {
                *kwargs['update_fields'],
                'indice_morosidad_porcentaje', 'cuadrante_matriz_2x2', 'estrategia_sugerida',
            }
        super().save(*args, **kwargs)
        matriz.sincronizar_barrios({self.barrio_id, barrio_anterior} - {None})


class HojaRutaSemanal(models.Model):
    class TipoGestion(models.TextChoices):
        COBRANZA = 'COBRANZA', 'Cobranza'
        NOVACION = 'NOVACION', 'Novación'
        PROMOCION = 'PROMOCION', 'Promoción'
        BRIGADA = 'BRIGADA', 'Brigada'

    class Estado(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        EN_CURSO = 'EN_CURSO', 'En curso'
        CUMPLIDA = 'CUMPLIDA', 'Cumplida'
        INCUMPLIDA = 'INCUMPLIDA', 'Incumplida'

    agencia = models.ForeignKey(Agencia, on_delete=models.PROTECT, related_name='hojas_ruta')
    barrio = models.ForeignKey(Barrio, on_delete=models.PROTECT, related_name='hojas_ruta')
    oficial_credito = models.CharField('oficial de crédito', max_length=120, validators=[MinLengthValidator(3)])
    semana_numero = models.PositiveSmallIntegerField(
        'número de semana', validators=[MinValueValidator(1), MaxValueValidator(53)])
    fecha_programada = models.DateField()
    tipo_gestion = models.CharField('tipo de gestión', max_length=15, choices=TipoGestion.choices)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.PENDIENTE)
    observaciones = models.TextField(blank=True)

    class Meta:
        verbose_name = 'hoja de ruta semanal'
        verbose_name_plural = 'hojas de ruta semanales'
        ordering = ['-fecha_programada', 'id']

    def __str__(self):
        return f'Semana {self.semana_numero}: {self.barrio} – {self.oficial_credito}'

    def clean(self):
        errores = v.errores_hoja_ruta(
            self.agencia if self.agencia_id else None, self.barrio if self.barrio_id else None,
            self.semana_numero, self.fecha_programada, self.estado)
        if errores:
            raise ValidationError(errores)


class ArchivoCargaCSV(models.Model):
    class TipoDataset(models.TextChoices):
        CARTERA_MORA = 'CARTERA_MORA', 'Cartera y morosidad'
        PROSPECTOS = 'PROSPECTOS', 'Potenciales socios'
        CENSO_INEC = 'CENSO_INEC', 'Censo INEC'

    class EstadoProcesamiento(models.TextChoices):
        PROCESADO = 'PROCESADO', 'Procesado'
        CON_OBSERVACIONES = 'CON_OBSERVACIONES', 'Con observaciones'
        FALLIDO = 'FALLIDO', 'Fallido'

    nombre_archivo = models.CharField(max_length=200, validators=[
        RegexValidator(r'(?i)\.csv$', 'El archivo debe tener extensión .csv.'),
    ])
    tipo_dataset = models.CharField(max_length=15, choices=TipoDataset.choices)
    total_filas_leidas = models.PositiveIntegerField()
    filas_validas = models.PositiveIntegerField()
    filas_con_error = models.PositiveIntegerField(default=0)
    estado_procesamiento = models.CharField(max_length=20, choices=EstadoProcesamiento.choices)
    detalle_errores = models.TextField(blank=True)
    fecha_carga = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'archivo de carga CSV'
        verbose_name_plural = 'archivos de carga CSV'
        ordering = ['-fecha_carga', '-id']
        constraints = [
            models.CheckConstraint(
                condition=Q(total_filas_leidas__gte=F('filas_validas') + F('filas_con_error')),
                name='filas_no_superan_total_leido'),
        ]

    def __str__(self):
        return self.nombre_archivo

    def clean(self):
        errores = v.errores_carga(
            self.total_filas_leidas, self.filas_validas, self.filas_con_error, self.estado_procesamiento)
        if errores:
            raise ValidationError(errores)


class ParametroAnalitico(models.Model):
    clave_parametro = models.CharField('clave', max_length=60, unique=True, validators=[
        RegexValidator(r'^[A-Z][A-Z0-9_]*$', 'Use mayúsculas, números y guion bajo (p. ej. UMBRAL_OPORTUNIDAD).'),
    ])
    descripcion = models.CharField('descripción', max_length=255)
    valor_numerico = models.DecimalField(
        'valor numérico', max_digits=16, decimal_places=4, validators=[MinValueValidator(Decimal('0'))])
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'parámetro analítico'
        verbose_name_plural = 'parámetros analíticos'
        ordering = ['clave_parametro']

    def __str__(self):
        return f'{self.clave_parametro} = {self.valor_numerico}'


class PerfilUsuario(models.Model):
    """Rol institucional y control de acceso de un usuario de Django (RF-001, RF-013)."""

    class Rol(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrador'
        JEFE_AGENCIA = 'JEFE_AGENCIA', 'Jefe de Agencia'
        OFICIAL_CREDITO = 'OFICIAL_CREDITO', 'Oficial de Crédito'
        SUPERVISOR_METODOLOGICO = 'SUPERVISOR_METODOLOGICO', 'Supervisor Metodológico'

    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='perfil')
    rol = models.CharField(max_length=30, choices=Rol.choices)
    agencia = models.ForeignKey(
        Agencia, on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios')
    intentos_fallidos = models.PositiveSmallIntegerField(default=0)
    bloqueado_hasta = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'perfil de usuario'
        verbose_name_plural = 'perfiles de usuario'
        ordering = ['usuario__username']

    def __str__(self):
        return f'{self.usuario} – {self.get_rol_display()}'

    @property
    def esta_bloqueado(self) -> bool:
        return self.bloqueado_hasta is not None and self.bloqueado_hasta > timezone.now()


class BitacoraAuditoria(models.Model):
    class TipoEvento(models.TextChoices):
        CREACION = 'CREACION', 'Creación'
        MODIFICACION = 'MODIFICACION', 'Modificación'
        ELIMINACION = 'ELIMINACION', 'Eliminación'
        CARGA_CSV = 'CARGA_CSV', 'Carga CSV'
        AJUSTE_PARAMETRO = 'AJUSTE_PARAMETRO', 'Ajuste de parámetro'
        ACCESO = 'ACCESO', 'Acceso'
        ACCESO_FALLIDO = 'ACCESO_FALLIDO', 'Acceso fallido'
        BLOQUEO_CUENTA = 'BLOQUEO_CUENTA', 'Bloqueo de cuenta'

    usuario_responsable = models.CharField(max_length=150)
    tipo_evento = models.CharField(max_length=20, choices=TipoEvento.choices)
    entidad_afectada = models.CharField(max_length=60)
    detalle_cambio = models.TextField(validators=[MinLengthValidator(5)])
    fecha_hora = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'registro de bitácora'
        verbose_name_plural = 'bitácora de auditoría'
        ordering = ['-fecha_hora', '-id']

    def __str__(self):
        return f'{self.tipo_evento} – {self.entidad_afectada}'
