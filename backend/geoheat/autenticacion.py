"""Inicio de sesión con JWT, roles y bloqueo por intentos fallidos (RF-001, CU-001)."""
from datetime import datetime, timedelta

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import AccessToken

from . import auditoria
from .models import PerfilUsuario

MAX_INTENTOS = 3
DURACION_BLOQUEO = timedelta(minutes=15)
CREDENCIALES_INVALIDAS = 'Usuario o contraseña incorrectos.'
CUENTA_BLOQUEADA = 'Cuenta bloqueada temporalmente por 3 intentos fallidos. Intente de nuevo en 15 minutos.'

Evento = auditoria.Evento


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(help_text='Nombre de usuario o correo institucional.')
    password = serializers.CharField(trim_whitespace=False, style={'input_type': 'password'})


class SesionSerializer(serializers.Serializer):
    token = serializers.CharField()
    tipo = serializers.CharField()
    expira = serializers.DateTimeField()
    usuario_id = serializers.IntegerField()
    username = serializers.CharField()
    nombre_completo = serializers.CharField()
    rol = serializers.ChoiceField(choices=PerfilUsuario.Rol.choices)
    rol_nombre = serializers.CharField()
    agencia = serializers.IntegerField(allow_null=True)
    agencia_nombre = serializers.CharField(allow_null=True)


class MensajeSerializer(serializers.Serializer):
    detail = serializers.CharField()


def buscar_perfil(identificador):
    """Perfil por nombre de usuario o correo, bloqueado en la transacción para contar bien los intentos."""
    User = get_user_model()
    usuario = User.objects.filter(username__iexact=identificador).first()
    if usuario is None:
        por_correo = User.objects.filter(email__iexact=identificador)[:2]
        usuario = por_correo[0] if len(por_correo) == 1 else None
    if usuario is None:
        return None
    if usuario.is_superuser:  # creado con createsuperuser: todavía no tiene perfil
        PerfilUsuario.objects.get_or_create(usuario=usuario, defaults={'rol': PerfilUsuario.Rol.ADMIN})
    return PerfilUsuario.objects.select_for_update(of=('self',)).select_related('usuario').filter(
        usuario=usuario).first()


def emitir_token(perfil):
    token = AccessToken.for_user(perfil.usuario)
    token['username'] = perfil.usuario.get_username()
    token['rol'] = perfil.rol
    token['agencia'] = perfil.agencia_id
    return token


class LoginView(APIView):
    authentication_classes = []  # un token vencido en la cabecera no debe impedir volver a entrar
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    @extend_schema(
        summary='Iniciar sesión', tags=['auth'], request=LoginSerializer, auth=[],
        responses={
            200: SesionSerializer,
            400: OpenApiResponse(description='Faltan campos'),
            401: OpenApiResponse(MensajeSerializer, description='Credenciales inválidas'),
            403: OpenApiResponse(MensajeSerializer, description='Cuenta bloqueada por 15 minutos'),
        })
    @transaction.atomic
    def post(self, request):
        datos = LoginSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        clave = datos.validated_data['password']
        perfil = buscar_perfil(datos.validated_data['username'])

        if perfil is None:
            # Mismo mensaje y costo de cómputo que una clave errada: no revela qué campo falló.
            authenticate(request, username='', password=clave)
            # No se guarda lo escrito: es habitual teclear la clave en el campo de usuario.
            auditoria.registrar_acceso(request, Evento.ACCESO_FALLIDO, None, 'Usuario no registrado')
            return Response({'detail': CREDENCIALES_INVALIDAS}, status=status.HTTP_401_UNAUTHORIZED)

        if perfil.esta_bloqueado:
            auditoria.registrar_acceso(
                request, Evento.ACCESO_FALLIDO, perfil.usuario, 'Intento con la cuenta bloqueada')
            return Response(
                {'detail': CUENTA_BLOQUEADA, 'bloqueado_hasta': perfil.bloqueado_hasta},
                status=status.HTTP_403_FORBIDDEN)
        if perfil.bloqueado_hasta:  # el bloqueo ya venció: la cuenta empieza de cero
            perfil.intentos_fallidos, perfil.bloqueado_hasta = 0, None

        if authenticate(request, username=perfil.usuario.get_username(), password=clave) is None:
            return self.registrar_fallo(request, perfil)

        perfil.intentos_fallidos, perfil.bloqueado_hasta = 0, None
        perfil.save(update_fields=['intentos_fallidos', 'bloqueado_hasta'])
        update_last_login(None, perfil.usuario)
        auditoria.registrar_acceso(
            request, Evento.ACCESO, perfil.usuario, f'Inicio de sesión con rol {perfil.rol}')
        token = emitir_token(perfil)
        return Response(SesionSerializer({
            'token': str(token), 'tipo': 'Bearer',
            'expira': datetime.fromtimestamp(token['exp'], tz=timezone.get_current_timezone()),
            'usuario_id': perfil.usuario_id, 'username': perfil.usuario.get_username(),
            'nombre_completo': perfil.usuario.get_full_name(),
            'rol': perfil.rol, 'rol_nombre': perfil.get_rol_display(),
            'agencia': perfil.agencia_id,
            'agencia_nombre': perfil.agencia.nombre_agencia if perfil.agencia else None,
        }).data)

    def registrar_fallo(self, request, perfil):
        perfil.intentos_fallidos += 1
        bloquear = perfil.intentos_fallidos >= MAX_INTENTOS
        if bloquear:
            perfil.bloqueado_hasta = timezone.now() + DURACION_BLOQUEO
        perfil.save(update_fields=['intentos_fallidos', 'bloqueado_hasta'])
        auditoria.registrar_acceso(
            request, Evento.ACCESO_FALLIDO, perfil.usuario,
            f'Contraseña incorrecta, intento {perfil.intentos_fallidos} de {MAX_INTENTOS}')
        if bloquear:
            auditoria.registrar_acceso(
                request, Evento.BLOQUEO_CUENTA, perfil.usuario,
                f'ALERTA: cuenta bloqueada por {DURACION_BLOQUEO.seconds // 60} minutos')
        return Response(
            {'detail': CUENTA_BLOQUEADA if bloquear else CREDENCIALES_INVALIDAS},
            status=status.HTTP_401_UNAUTHORIZED)
