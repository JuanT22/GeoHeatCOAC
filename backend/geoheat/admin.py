from django.contrib import admin

from . import auditoria
from .models import (
    Agencia, ArchivoCargaCSV, Barrio, BitacoraAuditoria, HojaRutaSemanal, IndicadorBarrio,
    ParametroAnalitico, PerfilUsuario, PotencialSocio, ZonaComercial,
)

admin.site.site_header = 'GeoHeat COAC – Administración'
admin.site.site_title = 'GeoHeat COAC'
admin.site.index_title = 'Microzonas comerciales · COAC Padre Julián Lorente'


class AuditadoAdmin(admin.ModelAdmin):
    """Los cambios hechos desde el admin también quedan en la bitácora (RF-014)."""
    list_per_page = 50

    def log_addition(self, request, obj, message):
        auditoria.registrar(request, auditoria.Evento.CREACION, obj, 'desde el panel de administración')
        return super().log_addition(request, obj, message)

    def log_change(self, request, obj, message):
        detalle = message if isinstance(message, str) else '; '.join(
            ', '.join(m.get('changed', {}).get('fields', [])) or ', '.join(m) for m in message)
        auditoria.registrar(
            request, auditoria.Evento.MODIFICACION, obj, f'desde el panel de administración: {detalle}')
        return super().log_change(request, obj, message)

    def log_deletions(self, request, queryset):
        for obj in queryset:
            auditoria.registrar(request, auditoria.Evento.ELIMINACION, obj, 'desde el panel de administración')
        return super().log_deletions(request, queryset)


class AgenciaInline(admin.TabularInline):
    model = Agencia
    extra = 0


class BarrioInline(admin.TabularInline):
    model = Barrio
    extra = 0


class IndicadorInline(admin.TabularInline):
    model = IndicadorBarrio
    extra = 0
    readonly_fields = ['cuadrante_matriz_2x2']


class PotencialSocioInline(admin.TabularInline):
    model = PotencialSocio
    extra = 0


class HojaRutaInline(admin.TabularInline):
    model = HojaRutaSemanal
    extra = 0
    fields = ['agencia', 'oficial_credito', 'semana_numero', 'fecha_programada', 'tipo_gestion', 'estado']


@admin.register(ZonaComercial)
class ZonaComercialAdmin(AuditadoAdmin):
    list_display = ['codigo_zona', 'nombre_zona', 'descripcion']
    list_filter = ['nombre_zona']
    search_fields = ['codigo_zona', 'nombre_zona']
    inlines = [AgenciaInline]


@admin.register(Agencia)
class AgenciaAdmin(AuditadoAdmin):
    list_display = ['nombre_agencia', 'zona', 'direccion', 'latitud_central', 'longitud_central']
    list_filter = ['zona']
    search_fields = ['nombre_agencia', 'direccion']
    list_select_related = ['zona']
    inlines = [BarrioInline]


@admin.register(Barrio)
class BarrioAdmin(AuditadoAdmin):
    list_display = ['nombre_barrio', 'codigo_inec', 'agencia', 'parroquia', 'canton', 'provincia',
                    'densidad_poblacional_inec', 'estrategia_2x2']
    list_filter = ['estrategia_2x2', 'provincia', 'agencia__zona', 'agencia']
    search_fields = ['nombre_barrio', 'codigo_inec', 'parroquia', 'canton']
    readonly_fields = ['estrategia_2x2']
    list_select_related = ['agencia']
    inlines = [IndicadorInline, PotencialSocioInline, HojaRutaInline]


@admin.register(PotencialSocio)
class PotencialSocioAdmin(AuditadoAdmin):
    list_display = ['identificacion', 'nombre_completo', 'barrio', 'actividad_economica',
                    'monto_credito_estimado', 'origen_registro', 'fecha_registro']
    list_filter = ['actividad_economica', 'origen_registro', 'barrio__agencia']
    search_fields = ['identificacion', 'nombre_completo', 'barrio__nombre_barrio']
    readonly_fields = ['fecha_registro']
    autocomplete_fields = ['barrio']
    list_select_related = ['barrio']


@admin.register(IndicadorBarrio)
class IndicadorBarrioAdmin(AuditadoAdmin):
    list_display = ['barrio', 'periodo_corte', 'monto_cartera_colocada', 'numero_creditos_activos',
                    'monto_cartera_vencida', 'indice_morosidad_porcentaje', 'cuadrante_matriz_2x2']
    list_filter = ['periodo_corte', 'cuadrante_matriz_2x2', 'barrio__agencia']
    search_fields = ['barrio__nombre_barrio', 'barrio__canton']
    readonly_fields = ['cuadrante_matriz_2x2', 'estrategia_sugerida']
    autocomplete_fields = ['barrio']
    list_select_related = ['barrio']


@admin.register(HojaRutaSemanal)
class HojaRutaSemanalAdmin(AuditadoAdmin):
    list_display = ['semana_numero', 'fecha_programada', 'agencia', 'barrio', 'oficial_credito',
                    'tipo_gestion', 'estado']
    list_filter = ['estado', 'tipo_gestion', 'agencia', 'semana_numero']
    search_fields = ['oficial_credito', 'barrio__nombre_barrio', 'observaciones']
    autocomplete_fields = ['agencia', 'barrio']
    list_select_related = ['agencia', 'barrio']


@admin.register(ArchivoCargaCSV)
class ArchivoCargaCSVAdmin(AuditadoAdmin):
    list_display = ['nombre_archivo', 'tipo_dataset', 'total_filas_leidas', 'filas_validas',
                    'filas_con_error', 'estado_procesamiento', 'fecha_carga']
    list_filter = ['tipo_dataset', 'estado_procesamiento', 'fecha_carga']
    search_fields = ['nombre_archivo', 'detalle_errores']
    readonly_fields = ['fecha_carga']


@admin.register(ParametroAnalitico)
class ParametroAnaliticoAdmin(AuditadoAdmin):
    list_display = ['clave_parametro', 'valor_numerico', 'descripcion', 'actualizado']
    list_filter = ['actualizado']
    search_fields = ['clave_parametro', 'descripcion']
    readonly_fields = ['actualizado']


@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(AuditadoAdmin):
    list_display = ['usuario', 'rol', 'agencia', 'intentos_fallidos', 'bloqueado_hasta']
    list_filter = ['rol', 'agencia']
    search_fields = ['usuario__username', 'usuario__email', 'usuario__first_name', 'usuario__last_name']
    autocomplete_fields = ['usuario', 'agencia']
    list_select_related = ['usuario', 'agencia']
    actions = ['desbloquear']

    @admin.action(description='Desbloquear las cuentas seleccionadas', permissions=['change'])
    def desbloquear(self, request, queryset):
        for perfil in queryset:
            perfil.intentos_fallidos, perfil.bloqueado_hasta = 0, None
            perfil.save(update_fields=['intentos_fallidos', 'bloqueado_hasta'])
            auditoria.registrar(request, auditoria.Evento.MODIFICACION, perfil, 'cuenta desbloqueada')
        self.message_user(request, 'Cuentas desbloqueadas.')


@admin.register(BitacoraAuditoria)
class BitacoraAuditoriaAdmin(admin.ModelAdmin):
    """Solo consulta: la bitácora es inmutable desde el panel (RF-014)."""
    list_display = ['fecha_hora', 'usuario_responsable', 'tipo_evento', 'entidad_afectada', 'detalle_cambio']
    list_filter = ['tipo_evento', 'entidad_afectada', 'fecha_hora']
    search_fields = ['usuario_responsable', 'entidad_afectada', 'detalle_cambio']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
