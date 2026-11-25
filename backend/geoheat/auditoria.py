"""Registro automático en la bitácora (RF-014): usuario, fecha/hora, IP y detalle."""
from .models import ArchivoCargaCSV, BitacoraAuditoria, ParametroAnalitico, PerfilUsuario

Evento = BitacoraAuditoria.TipoEvento

# LOPDP (RNF-001): estos valores no se copian a la bitácora, solo consta que cambiaron.
CAMPOS_PERSONALES = {'identificacion', 'nombre_completo', 'direccion_referencia', 'latitud', 'longitud',
                     'email', 'first_name', 'last_name', 'password'}
CAMPOS_CUENTA = ('username', 'email', 'first_name', 'last_name', 'is_active', 'password')


def valores(instancia):
    datos = {c.name: c.value_from_object(instancia) for c in instancia._meta.concrete_fields}
    if isinstance(instancia, PerfilUsuario):
        datos |= {c: getattr(instancia.usuario, c) for c in CAMPOS_CUENTA}
    return datos


def describir_cambios(antes, despues):
    cambios = []
    for campo, nuevo in despues.items():
        if antes.get(campo) != nuevo:
            cambios.append(
                f'{campo} (dato protegido)' if campo in CAMPOS_PERSONALES
                else f'{campo}: {antes.get(campo)} → {nuevo}')
    return '; '.join(cambios) or 'sin cambios de valor'


def registrar_acceso(request, evento, usuario, detalle):
    """Eventos de inicio de sesión (RF-001)."""
    BitacoraAuditoria.objects.create(
        usuario_responsable=usuario.get_username() if usuario else 'anónimo',
        tipo_evento=evento,
        entidad_afectada='PerfilUsuario',
        detalle_cambio=f'IP {request.META.get("REMOTE_ADDR", "desconocida")} | {detalle}',
    )


def registrar(request, evento, instancia, detalle='', pk=None):
    if isinstance(instancia, BitacoraAuditoria):
        return
    if evento != Evento.ELIMINACION:
        if isinstance(instancia, ParametroAnalitico):
            evento = Evento.AJUSTE_PARAMETRO
        elif isinstance(instancia, ArchivoCargaCSV) and evento == Evento.CREACION:
            evento = Evento.CARGA_CSV
    usuario = getattr(request, 'user', None)
    BitacoraAuditoria.objects.create(
        usuario_responsable=usuario.get_username() if usuario and usuario.is_authenticated else 'anónimo',
        tipo_evento=evento,
        entidad_afectada=type(instancia).__name__,
        detalle_cambio=(
            f'ID {pk or instancia.pk} | IP {request.META.get("REMOTE_ADDR", "desconocida")}'
            + (f' | {detalle}' if detalle else '')
        ),
    )
