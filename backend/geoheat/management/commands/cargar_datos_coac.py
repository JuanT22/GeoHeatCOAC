"""Carga datos semilla de la COAC Padre Julián Lorente (idempotente).

Son reales según el documento de requisitos: zonas, agencias, barrios de Loja, línea base
institucional ($43.998.961, 18.813 créditos, 1.852 barrios) y promedio de Catamayo ($49.582/barrio).
Los valores por barrio y los nombres/identificaciones de personas son ilustrativos: el documento
no los publica y la LOPDP (RNF-001) impide usar datos personales reales.
"""
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from geoheat.matriz import PARAMETROS_POR_DEFECTO
from geoheat.models import (
    Agencia, ArchivoCargaCSV, Barrio, BitacoraAuditoria, HojaRutaSemanal, IndicadorBarrio,
    ParametroAnalitico, PerfilUsuario, PotencialSocio, ZonaComercial,
)

PERIODO_ANTERIOR, PERIODO_ACTUAL = date(2026, 9, 30), date(2026, 10, 31)

ZONAS = [
    ('Z1', 'Zona 1 - Norte', 'Ciudad de Loja, atendida por la Oficina Norte.'),
    ('Z2', 'Zona 2 - R5', 'Catamayo, Catacocha y Celica.'),
    ('Z3', 'Zona 3 - R5', 'Cariamanga, Malacatos y Vilcabamba.'),
    ('Z4', 'Zona 4 - R5', 'Palanda y Zumba (Zamora Chinchipe); Pasaje y Piñas (El Oro).'),
]

# zona, agencia, dirección, latitud, longitud
AGENCIAS = [
    ('Z1', 'Oficina Norte', 'Sector norte, Loja', '-3.971200', '-79.205900'),
    ('Z2', 'Catamayo', 'Centro de Catamayo', '-3.986700', '-79.355600'),
    ('Z2', 'Catacocha', 'Centro de Catacocha', '-4.050000', '-79.647000'),
    ('Z2', 'Celica', 'Centro de Celica', '-4.104000', '-79.954000'),
    ('Z3', 'Cariamanga', 'Centro de Cariamanga', '-4.331000', '-79.554500'),
    ('Z3', 'Malacatos', 'Parque central de Malacatos', '-4.219000', '-79.258000'),
    ('Z3', 'Vilcabamba', 'Parque central de Vilcabamba', '-4.261000', '-79.223000'),
    ('Z4', 'Palanda', 'Centro de Palanda', '-4.648000', '-79.132000'),
    ('Z4', 'Zumba', 'Centro de Zumba', '-4.865000', '-79.133000'),
    ('Z4', 'Pasaje', 'Centro de Pasaje', '-3.326000', '-79.807000'),
    ('Z4', 'Piñas', 'Centro de Piñas', '-3.680000', '-79.681000'),
]

# agencia, código, barrio, parroquia, cantón, provincia, lat, lon, densidad, familias,
# cartera colocada, créditos, mora %, socios activos, potenciales
BARRIOS = [
    ('Oficina Norte', '110150001', 'San Sebastián', 'San Sebastián', 'Loja', 'Loja', '-4.001500', '-79.201500', 5200, 1250, 41200, 18, '2.10', 96, 120),
    ('Oficina Norte', '110150002', 'La Pradera', 'San Sebastián', 'Loja', 'Loja', '-4.012300', '-79.199800', 4600, 980, 33500, 15, '3.20', 74, 95),
    ('Oficina Norte', '110150003', 'El Rosal', 'Sucre', 'Loja', 'Loja', '-3.999000', '-79.213500', 4100, 760, 12400, 6, '7.80', 31, 88),
    ('Oficina Norte', '110150004', 'El Capulí', 'San Sebastián', 'Loja', 'Loja', '-4.033500', '-79.203900', 1900, 420, 9800, 5, '9.40', 22, 35),
    ('Oficina Norte', '110150005', 'La Argelia', 'San Sebastián', 'Loja', 'Loja', '-4.035600', '-79.199200', 2300, 610, 27900, 12, '2.60', 58, 42),
    ('Catamayo', '110350001', 'La Vega', 'Catamayo', 'Catamayo', 'Loja', '-3.989500', '-79.362000', 3900, 720, 52364, 21, '1.90', 102, 90),
    ('Catamayo', '110350002', 'Trapichillo', 'Catamayo', 'Catamayo', 'Loja', '-3.979000', '-79.349500', 2600, 530, 46800, 19, '2.40', 88, 46),
    ('Catacocha', '110950001', 'Centro Catacocha', 'Catacocha', 'Paltas', 'Loja', '-4.050400', '-79.647200', 2100, 480, 25100, 11, '3.50', 49, 40),
    ('Catacocha', '110950002', 'El Placer', 'Catacocha', 'Paltas', 'Loja', '-4.058000', '-79.640000', 430, 130, 6200, 3, '11.20', 12, 14),
    ('Celica', '110450001', 'Centro Celica', 'Celica', 'Celica', 'Loja', '-4.104200', '-79.954300', 1800, 390, 21600, 9, '4.10', 41, 32),
    ('Celica', '110450002', 'San Vicente', 'Celica', 'Celica', 'Loja', '-4.110000', '-79.948000', 690, 160, 7900, 4, '8.60', 15, 18),
    ('Cariamanga', '110250001', 'Centro Cariamanga', 'Cariamanga', 'Calvas', 'Loja', '-4.331200', '-79.554800', 3400, 690, 38700, 16, '2.90', 83, 85),
    ('Cariamanga', '110250002', 'San José', 'Cariamanga', 'Calvas', 'Loja', '-4.326000', '-79.548000', 3600, 450, 11300, 5, '8.10', 24, 92),
    ('Malacatos', '110156001', 'Centro Malacatos', 'Malacatos', 'Loja', 'Loja', '-4.219300', '-79.258400', 1500, 360, 24300, 10, '3.00', 47, 38),
    ('Malacatos', '110156002', 'La Trinidad', 'Malacatos', 'Loja', 'Loja', '-4.228000', '-79.264000', 480, 140, 5400, 3, '10.50', 10, 16),
    ('Vilcabamba', '110161001', 'Centro Vilcabamba', 'Vilcabamba', 'Loja', 'Loja', '-4.261300', '-79.223200', 1700, 340, 22800, 10, '2.70', 44, 41),
    ('Vilcabamba', '110161002', 'Yamburara', 'Vilcabamba', 'Loja', 'Loja', '-4.252000', '-79.215000', 620, 150, 8300, 4, '7.20', 16, 20),
    ('Palanda', '190850001', 'Centro Palanda', 'Palanda', 'Palanda', 'Zamora Chinchipe', '-4.648300', '-79.132300', 1100, 280, 23900, 10, '3.80', 39, 30),
    ('Palanda', '190850002', 'Agua Dulce', 'Palanda', 'Palanda', 'Zamora Chinchipe', '-4.660000', '-79.138000', 310, 110, 4900, 2, '12.30', 8, 11),
    ('Zumba', '190250001', 'Centro Zumba', 'Zumba', 'Chinchipe', 'Zamora Chinchipe', '-4.865300', '-79.133200', 1300, 310, 24600, 10, '3.30', 42, 34),
    ('Pasaje', '070950001', 'Centro Pasaje', 'Pasaje', 'Pasaje', 'El Oro', '-3.326400', '-79.807200', 5600, 1400, 29400, 13, '4.40', 62, 130),
    ('Pasaje', '070950002', 'Loma de Franco', 'Pasaje', 'Pasaje', 'El Oro', '-3.334000', '-79.799000', 4900, 870, 10100, 5, '8.90', 21, 104),
    ('Piñas', '071050001', 'Centro Piñas', 'Piñas', 'Piñas', 'El Oro', '-3.680300', '-79.681400', 2400, 560, 34200, 14, '2.20', 71, 47),
    ('Piñas', '071050002', 'La Susaya', 'Piñas', 'Piñas', 'El Oro', '-3.673000', '-79.689000', 850, 190, 8700, 4, '6.90', 17, 23),
]

LINEA_BASE = {
    'LINEA_BASE_CARTERA': (Decimal('43998961'), 'Cartera total institucional (USD)'),
    'LINEA_BASE_CREDITOS': (Decimal('18813'), 'Número total de créditos institucionales'),
    'LINEA_BASE_BARRIOS': (Decimal('1852'), 'Número total de barrios (microzonas comerciales)'),
}

NOMBRES = ['María', 'José', 'Carmen', 'Luis', 'Rosa', 'Ángel', 'Diana', 'Manuel', 'Gloria', 'Jorge', 'Elena', 'Víctor']
APELLIDOS = ['Guamán', 'Jaramillo', 'Ordóñez', 'Cueva', 'Sarango', 'Torres', 'Quizhpe', 'Ludeña', 'Aguirre', 'Macas',
             'Vivanco']
REFERENCIAS = {
    'MICROEMPRESA': 'Taller junto al parque', 'COMERCIO': 'Tienda frente a la iglesia',
    'AGROPECUARIO': 'Finca a 500 m de la vía principal', 'SERVICIOS': 'Local cerca de la escuela',
}

OFICIAL_LOJA, OFICIAL_CATAMAYO, OFICIAL_PINAS = 'Oficial Loja 01', 'Oficial Catamayo 01', 'Oficial Piñas 01'

# barrio (código), oficial, fecha, gestión, estado, observaciones
HOJAS = [
    ('110150001', OFICIAL_LOJA, date(2026, 11, 16), 'PROMOCION', 'CUMPLIDA', '1. San Sebastián: 8 prospectos contactados.'),
    ('110150002', OFICIAL_LOJA, date(2026, 11, 17), 'NOVACION', 'CUMPLIDA', '2. La Pradera: 3 novaciones en trámite.'),
    ('110150003', OFICIAL_LOJA, date(2026, 11, 18), 'COBRANZA', 'CUMPLIDA', '3. El Rosal: 2 compromisos de pago.'),
    ('110150004', OFICIAL_LOJA, date(2026, 11, 19), 'COBRANZA', 'INCUMPLIDA', '4. El Capulí: no se visitó por lluvia.'),
    ('110150005', OFICIAL_LOJA, date(2026, 11, 20), 'BRIGADA', 'CUMPLIDA', '5. La Argelia: brigada con 12 asistentes.'),
    ('110350001', OFICIAL_CATAMAYO, date(2026, 11, 23), 'NOVACION', 'EN_CURSO', ''),
    ('110350002', OFICIAL_CATAMAYO, date(2026, 11, 30), 'PROMOCION', 'PENDIENTE', ''),
    ('071050001', OFICIAL_PINAS, date(2026, 12, 1), 'PROMOCION', 'PENDIENTE', ''),
    ('071050002', OFICIAL_PINAS, date(2026, 12, 2), 'COBRANZA', 'PENDIENTE', ''),
]

# usuario, rol, agencia, nombre, apellido (dominio reservado .example: no son correos reales)
USUARIOS = [
    ('admin.geoheat', 'ADMIN', None, 'Administrador', 'Demo'),
    ('jefe.agencia', 'JEFE_AGENCIA', 'Oficina Norte', 'Jefe Agencia', 'Demo'),
    ('oficial.credito', 'OFICIAL_CREDITO', 'Oficina Norte', 'Oficial Crédito', 'Demo'),
    ('supervisor.metodologico', 'SUPERVISOR_METODOLOGICO', None, 'Supervisor Metodológico', 'Demo'),
]

# archivo, dataset, leídas, válidas, con error, estado, detalle
CARGAS = [
    ('cartera_mora_2026_10.csv', 'CARTERA_MORA', 18813, 18813, 0, 'PROCESADO', ''),
    ('censo_inec_barrios.csv', 'CENSO_INEC', 1852, 1840, 12, 'CON_OBSERVACIONES', '12 filas sin coordenadas válidas.'),
    ('prospectos_campo_2026_10.csv', 'PROSPECTOS', 48, 46, 2, 'CON_OBSERVACIONES',
     'Fila 17: identificación nula. Fila 33: latitud fuera de rango.'),
    ('prospectos_sin_cabecera.csv', 'PROSPECTOS', 30, 0, 30, 'FALLIDO',
     'Faltan las columnas obligatorias: latitud, longitud.'),
]


class Command(BaseCommand):
    help = 'Carga los datos semilla de la COAC Padre Julián Lorente.'

    @transaction.atomic
    def handle(self, *args, **options):
        # get_or_create: volver a ejecutar no pisa los umbrales ajustados por el Administrador.
        for clave, (valor, descripcion) in {**PARAMETROS_POR_DEFECTO, **LINEA_BASE}.items():
            ParametroAnalitico.objects.get_or_create(
                clave_parametro=clave, defaults={'valor_numerico': valor, 'descripcion': descripcion})

        zonas = {
            codigo: ZonaComercial.objects.update_or_create(
                codigo_zona=codigo, defaults={'nombre_zona': nombre, 'descripcion': descripcion})[0]
            for codigo, nombre, descripcion in ZONAS
        }
        agencias = {
            nombre: Agencia.objects.update_or_create(
                zona=zonas[zona], nombre_agencia=nombre,
                defaults={'direccion': direccion, 'latitud_central': Decimal(lat), 'longitud_central': Decimal(lon)},
            )[0]
            for zona, nombre, direccion, lat, lon in AGENCIAS
        }
        barrios = {}
        for indice, fila in enumerate(BARRIOS):
            barrio = self.cargar_barrio(agencias, fila)
            barrios[barrio.codigo_inec] = barrio
            self.cargar_potenciales(barrio, indice)

        for codigo, oficial, fecha, gestion, estado, observaciones in HOJAS:
            barrio = barrios[codigo]
            HojaRutaSemanal.objects.update_or_create(
                barrio=barrio, oficial_credito=oficial, fecha_programada=fecha,
                defaults={'agencia': barrio.agencia, 'semana_numero': fecha.isocalendar().week,
                          'tipo_gestion': gestion, 'estado': estado, 'observaciones': observaciones})

        for nombre, dataset, leidas, validas, con_error, estado, detalle in CARGAS:
            _, creada = ArchivoCargaCSV.objects.update_or_create(
                nombre_archivo=nombre,
                defaults={'tipo_dataset': dataset, 'total_filas_leidas': leidas, 'filas_validas': validas,
                          'filas_con_error': con_error, 'estado_procesamiento': estado,
                          'detalle_errores': detalle})
            if creada:
                BitacoraAuditoria.objects.create(
                    usuario_responsable='sistema', tipo_evento='CARGA_CSV', entidad_afectada='ArchivoCargaCSV',
                    detalle_cambio=f'Dato semilla: {nombre} ({validas} válidas, {con_error} con error)')

        self.cargar_usuarios(agencias)

        for modelo in (ZonaComercial, Agencia, Barrio, PotencialSocio, IndicadorBarrio, HojaRutaSemanal,
                       ArchivoCargaCSV, ParametroAnalitico, PerfilUsuario, BitacoraAuditoria):
            self.stdout.write(f'  {modelo._meta.verbose_name_plural}: {modelo.objects.count()}')
        self.stdout.write(self.style.SUCCESS('Datos de la COAC cargados correctamente.'))

    def cargar_usuarios(self, agencias):
        for username, rol, agencia, nombre, apellido in USUARIOS:
            usuario, creado = get_user_model().objects.get_or_create(username=username, defaults={
                'email': f'{username}@geoheat.example', 'first_name': nombre, 'last_name': apellido})
            # No se pisa una contraseña que ya se haya cambiado.
            if settings.DEMO_USERS_PASSWORD and (creado or not usuario.has_usable_password()):
                usuario.set_password(settings.DEMO_USERS_PASSWORD)
                usuario.save()
            elif creado:
                usuario.set_unusable_password()
                usuario.save()
            PerfilUsuario.objects.get_or_create(
                usuario=usuario, defaults={'rol': rol, 'agencia': agencias.get(agencia)})
        if not settings.DEMO_USERS_PASSWORD:
            self.stdout.write(self.style.WARNING(
                'DEMO_USERS_PASSWORD no está definida en .env: los usuarios de prueba no podrán iniciar sesión.'))

    def cargar_barrio(self, agencias, fila):
        (agencia, codigo, nombre, parroquia, canton, provincia, lat, lon, densidad, familias,
         colocada, creditos, mora, socios, potenciales) = fila
        barrio, _ = Barrio.objects.update_or_create(codigo_inec=codigo, defaults={
            'agencia': agencias[agencia], 'nombre_barrio': nombre, 'parroquia': parroquia, 'canton': canton,
            'provincia': provincia, 'latitud_centroide': Decimal(lat), 'longitud_centroide': Decimal(lon),
            'densidad_poblacional_inec': Decimal(densidad), 'numero_familias_estimado': familias,
        })
        centavo = Decimal('0.01')
        for periodo, factor, ajuste_mora in (
            (PERIODO_ANTERIOR, Decimal('0.96'), Decimal('0.40')),
            (PERIODO_ACTUAL, Decimal('1'), Decimal('0')),
        ):
            monto = (Decimal(colocada) * factor).quantize(centavo)
            indice = Decimal(mora) + ajuste_mora
            IndicadorBarrio.objects.update_or_create(barrio=barrio, periodo_corte=periodo, defaults={
                'monto_cartera_colocada': monto, 'numero_creditos_activos': creditos,
                'monto_cartera_vencida': (monto * indice / 100).quantize(centavo),
                'indice_morosidad_porcentaje': indice, 'total_socios_activos': socios,
                'total_potenciales_socios': potenciales,
            })
        return barrio

    def cargar_potenciales(self, barrio, indice):
        actividades = PotencialSocio.ActividadEconomica.values
        for j in range(2):
            n = indice * 2 + j
            actividad = actividades[n % len(actividades)]
            PotencialSocio.objects.update_or_create(identificacion=f'00{n + 1:08d}', defaults={
                'barrio': barrio,
                'nombre_completo': f'{NOMBRES[n % len(NOMBRES)]} {APELLIDOS[n % len(APELLIDOS)]} (ejemplo)',
                'actividad_economica': actividad,
                'latitud': barrio.latitud_centroide + Decimal('0.0006') * (j + 1),
                'longitud': barrio.longitud_centroide - Decimal('0.0005') * (j + 1),
                'direccion_referencia': REFERENCIAS[actividad],
                'monto_credito_estimado': Decimal(1500 + 350 * (n % 12)),
                'origen_registro': 'CAMPO' if j == 0 else 'CSV',
            })
