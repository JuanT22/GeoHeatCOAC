import secrets
from datetime import date, timedelta
from decimal import Decimal
from io import StringIO
from unittest.mock import patch

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from . import etl, matriz, prediccion
from .models import (
    Agencia, ArchivoCargaCSV, Barrio, BitacoraAuditoria, HojaRutaSemanal, IndicadorBarrio,
    ParametroAnalitico, PerfilUsuario, PotencialSocio, ZonaComercial,
)

CLAVE = secrets.token_urlsafe(16)  # generada en cada ejecución: sin credenciales en el código
FECHA_VISITA = date(2026, 1, 12)  # lunes de la semana ISO 3


class DatosBase:
    """Un registro de cada entidad."""

    @classmethod
    def setUpTestData(cls):
        cls.zona = ZonaComercial.objects.create(codigo_zona='Z1', nombre_zona='Zona 1 - Norte')
        cls.agencia = Agencia.objects.create(
            zona=cls.zona, nombre_agencia='Oficina Norte', direccion='Loja',
            latitud_central=Decimal('-3.97'), longitud_central=Decimal('-79.20'))
        cls.otra_agencia = Agencia.objects.create(
            zona=cls.zona, nombre_agencia='Catamayo', direccion='Catamayo',
            latitud_central=Decimal('-3.98'), longitud_central=Decimal('-79.35'))
        cls.barrio = Barrio.objects.create(
            agencia=cls.agencia, codigo_inec='110150001', nombre_barrio='San Sebastián',
            parroquia='San Sebastián', canton='Loja', provincia='Loja',
            latitud_centroide=Decimal('-4.0'), longitud_centroide=Decimal('-79.2'),
            densidad_poblacional_inec=Decimal('5200'), numero_familias_estimado=1250)
        cls.potencial = PotencialSocio.objects.create(
            barrio=cls.barrio, identificacion='0000000001', nombre_completo='Persona Ejemplo',
            actividad_economica='COMERCIO', latitud=Decimal('-4.0'), longitud=Decimal('-79.2'),
            monto_credito_estimado=Decimal('2500'))
        cls.indicador = IndicadorBarrio.objects.create(
            barrio=cls.barrio, periodo_corte=date(2026, 10, 31), monto_cartera_colocada=Decimal('40000'),
            numero_creditos_activos=16, monto_cartera_vencida=Decimal('800'),
            total_socios_activos=90, total_potenciales_socios=120)
        cls.hoja = HojaRutaSemanal.objects.create(
            agencia=cls.agencia, barrio=cls.barrio, oficial_credito='Oficial Loja 01', semana_numero=3,
            fecha_programada=FECHA_VISITA, tipo_gestion='PROMOCION')
        cls.carga = ArchivoCargaCSV.objects.create(
            nombre_archivo='cartera.csv', tipo_dataset='CARTERA_MORA', total_filas_leidas=100,
            filas_validas=98, filas_con_error=2, estado_procesamiento='CON_OBSERVACIONES')
        cls.parametro = ParametroAnalitico.objects.create(
            clave_parametro='PARAMETRO_PRUEBA', descripcion='De prueba', valor_numerico=Decimal('1'))
        cls.bitacora = BitacoraAuditoria.objects.create(
            usuario_responsable='admin', tipo_evento='ACCESO', entidad_afectada='Usuario',
            detalle_cambio='Ingreso al sistema')
        cls.usuario = get_user_model().objects.create_user('oficial.prueba', 'oficial@geoheat.example', CLAVE)
        cls.perfil = PerfilUsuario.objects.create(
            usuario=cls.usuario, rol='OFICIAL_CREDITO', agencia=cls.agencia)


class CrudMixin(DatosBase):
    """Verifica 200, 201, 204, 400 y 404 del CRUD de una entidad."""
    ruta = None
    parche = {}
    # Lista de cuerpos parciales que deben ser rechazados con 400, con el campo señalado.
    invalidos = []

    def cuerpo(self):
        raise NotImplementedError

    def objeto(self):
        raise NotImplementedError

    def url(self, pk=None):
        return f'/api/{self.ruta}/' + (f'{pk}/' if pk else '')

    def crear(self):
        r = self.client.post(self.url(), self.cuerpo(), format='json')
        self.assertEqual(r.status_code, 201, r.data)
        return r.data['id']

    def test_listar_200(self):
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertIn(self.objeto().pk, [fila['id'] for fila in r.data])

    def test_detalle_200(self):
        r = self.client.get(self.url(self.objeto().pk))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['id'], self.objeto().pk)

    def test_crear_201(self):
        pk = self.crear()
        self.assertEqual(self.client.get(self.url(pk)).status_code, 200)

    def test_actualizar_put_200(self):
        pk = self.crear()
        r = self.client.put(self.url(pk), {**self.cuerpo(), **self.parche}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self._verificar_parche(pk)

    def test_actualizar_patch_200(self):
        pk = self.crear()
        r = self.client.patch(self.url(pk), self.parche, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self._verificar_parche(pk)

    def _verificar_parche(self, pk):
        datos = self.client.get(self.url(pk)).data
        for campo, valor in self.parche.items():
            self.assertEqual(datos[campo], valor)

    def test_eliminar_204(self):
        pk = self.crear()
        self.assertEqual(self.client.delete(self.url(pk)).status_code, 204)
        self.assertEqual(self.client.get(self.url(pk)).status_code, 404)

    def test_cuerpo_vacio_400(self):
        self.assertEqual(self.client.post(self.url(), {}, format='json').status_code, 400)

    def test_crear_invalido_400(self):
        for campo, cambios in self.invalidos:
            with self.subTest(campo=campo, cambios=cambios):
                r = self.client.post(self.url(), {**self.cuerpo(), **cambios}, format='json')
                self.assertEqual(r.status_code, 400, r.data)
                self.assertIn(campo, r.data)

    def test_patch_invalido_400(self):
        pk = self.crear()
        for campo, cambios in self.invalidos:
            with self.subTest(campo=campo, cambios=cambios):
                r = self.client.patch(self.url(pk), cambios, format='json')
                self.assertEqual(r.status_code, 400, r.data)
                self.assertIn(campo, r.data)

    def test_inexistente_404(self):
        url = self.url(999999)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.put(url, self.cuerpo(), format='json').status_code, 404)
        self.assertEqual(self.client.patch(url, self.parche, format='json').status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)


class ZonaComercialTests(CrudMixin, APITestCase):
    ruta = 'zonas'
    parche = {'nombre_zona': 'Zona renombrada'}
    invalidos = [('codigo_zona', {'codigo_zona': 'Z1'}), ('nombre_zona', {'nombre_zona': 'X'})]

    def cuerpo(self):
        return {'codigo_zona': 'Z9', 'nombre_zona': 'Zona 9'}

    def objeto(self):
        return self.zona

    def test_eliminar_con_dependencias_400(self):
        r = self.client.delete(self.url(self.zona.pk))
        self.assertEqual(r.status_code, 400)
        self.assertIn('agencias', r.data['detail'])
        self.assertTrue(ZonaComercial.objects.filter(pk=self.zona.pk).exists())


class AgenciaTests(CrudMixin, APITestCase):
    ruta = 'agencias'
    parche = {'direccion': 'Nueva dirección'}
    invalidos = [
        ('latitud_central', {'latitud_central': -5.01}), ('latitud_central', {'latitud_central': 1.51}),
        ('longitud_central', {'longitud_central': -92.01}), ('longitud_central', {'longitud_central': -74.99}),
        ('zona', {'zona': 999999}), ('latitud_central', {'latitud_central': 'NaN'}),
    ]

    def cuerpo(self):
        return {'zona': self.zona.pk, 'nombre_agencia': 'Piñas', 'direccion': 'Centro',
                'latitud_central': -3.68, 'longitud_central': -79.68}

    def objeto(self):
        return self.agencia

    def test_nombre_repetido_en_zona_400(self):
        r = self.client.post(self.url(), {**self.cuerpo(), 'nombre_agencia': 'Oficina Norte'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_limites_exactos_201(self):
        for i, (lat, lon) in enumerate([(-5.0, -92.0), (1.5, -75.0)]):
            r = self.client.post(self.url(), {
                **self.cuerpo(), 'nombre_agencia': f'Límite {i}',
                'latitud_central': lat, 'longitud_central': lon}, format='json')
            self.assertEqual(r.status_code, 201, r.data)


class BarrioTests(CrudMixin, APITestCase):
    ruta = 'barrios'
    parche = {'numero_familias_estimado': 700}
    invalidos = [
        ('codigo_inec', {'codigo_inec': 'ABC'}), ('codigo_inec', {'codigo_inec': '110150001'}),
        ('latitud_centroide', {'latitud_centroide': 2}), ('longitud_centroide', {'longitud_centroide': -70}),
        ('densidad_poblacional_inec', {'densidad_poblacional_inec': -1}),
        ('numero_familias_estimado', {'numero_familias_estimado': -1}),
        ('provincia', {'provincia': 'Pichincha'}), ('agencia', {'agencia': 999999}),
    ]

    def cuerpo(self):
        return {'agencia': self.agencia.pk, 'codigo_inec': '110150002', 'nombre_barrio': 'La Pradera',
                'parroquia': 'San Sebastián', 'canton': 'Loja', 'provincia': 'Loja',
                'latitud_centroide': -4.01, 'longitud_centroide': -79.19,
                'densidad_poblacional_inec': 4600, 'numero_familias_estimado': 980}

    def objeto(self):
        return self.barrio

    def test_normaliza_nombres(self):
        r = self.client.post(self.url(), {
            **self.cuerpo(), 'nombre_barrio': '  la   PRADERA de la LOMA ', 'canton': 'LOJA'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['nombre_barrio'], 'La Pradera de la Loma')
        self.assertEqual(r.data['canton'], 'Loja')

    def test_estrategia_es_solo_lectura(self):
        r = self.client.post(self.url(), {**self.cuerpo(), 'estrategia_2x2': 'VISITAS_FRECUENTES'}, format='json')
        self.assertEqual(r.data['estrategia_2x2'], '')

    def test_cambiar_densidad_reclasifica(self):
        r = self.client.patch(self.url(self.barrio.pk), {'densidad_poblacional_inec': 0}, format='json')
        self.assertEqual(r.status_code, 200)
        self.client.patch(f'/api/indicadores/{self.indicador.pk}/', {'total_potenciales_socios': 20}, format='json')
        self.assertEqual(self.client.get(self.url(self.barrio.pk)).data['estrategia_2x2'], 'VISITAS_MODERADAS')
        r = self.client.patch(self.url(self.barrio.pk), {'densidad_poblacional_inec': 9000}, format='json')
        self.assertEqual(r.data['estrategia_2x2'], 'VISITAS_FRECUENTES')

    def test_contador_de_potenciales(self):
        self.assertEqual(self.client.get(self.url(self.barrio.pk)).data['total_potenciales_registrados'], 1)

    def test_filtro_busqueda_y_orden(self):
        self.crear()
        self.assertEqual(len(self.client.get(self.url(), {'search': 'pradera'}).data), 1)
        self.assertEqual(len(self.client.get(self.url(), {'agencia': self.otra_agencia.pk}).data), 0)
        r = self.client.get(self.url(), {'ordering': 'densidad_poblacional_inec'})
        self.assertEqual(r.data[0]['nombre_barrio'], 'La Pradera')


class PotencialSocioTests(CrudMixin, APITestCase):
    ruta = 'potenciales-socios'
    parche = {'nombre_completo': 'Otro Nombre'}
    invalidos = [
        ('identificacion', {'identificacion': '123'}), ('identificacion', {'identificacion': '0000000001'}),
        ('actividad_economica', {'actividad_economica': 'MINERIA'}), ('origen_registro', {'origen_registro': 'WEB'}),
        ('latitud', {'latitud': -6}), ('longitud', {'longitud': 0}),
        ('monto_credito_estimado', {'monto_credito_estimado': 0}), ('barrio', {'barrio': 999999}),
    ]

    def cuerpo(self):
        return {'barrio': self.barrio.pk, 'identificacion': '0000000002', 'nombre_completo': 'Persona Dos',
                'actividad_economica': 'MICROEMPRESA', 'latitud': -4.0, 'longitud': -79.2,
                'direccion_referencia': 'Parque', 'monto_credito_estimado': 3000, 'origen_registro': 'CAMPO'}

    def objeto(self):
        return self.potencial

    def test_redondea_precision_gps(self):
        r = self.client.post(self.url(), {
            **self.cuerpo(), 'latitud': -3.99312345678912, 'longitud': -79.20412345678912}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['latitud'], Decimal('-3.993123'))

    def test_bitacora_no_expone_datos_personales(self):
        self.client.patch(self.url(self.potencial.pk), {
            'identificacion': '0999999999', 'nombre_completo': 'Nombre Reservado'}, format='json')
        detalle = BitacoraAuditoria.objects.first().detalle_cambio
        self.assertIn('nombre_completo (dato protegido)', detalle)
        self.assertNotIn('Reservado', detalle)
        self.assertNotIn('0999999999', detalle)


class IndicadorBarrioTests(CrudMixin, APITestCase):
    ruta = 'indicadores'
    parche = {'total_socios_activos': 99}
    invalidos = [
        ('monto_cartera_vencida', {'monto_cartera_vencida': 10000.01}),
        ('monto_cartera_colocada', {'monto_cartera_colocada': -1}),
        ('indice_morosidad_porcentaje', {'indice_morosidad_porcentaje': 100.01}),
        ('indice_morosidad_porcentaje', {'indice_morosidad_porcentaje': -0.01}),
        ('numero_creditos_activos', {'numero_creditos_activos': -1}),
        ('periodo_corte', {'periodo_corte': 'ayer'}),
    ]

    def cuerpo(self):
        return {'barrio': self.barrio.pk, 'periodo_corte': '2026-11-30', 'monto_cartera_colocada': 10000,
                'numero_creditos_activos': 5, 'monto_cartera_vencida': 900,
                'total_socios_activos': 30, 'total_potenciales_socios': 10}

    def objeto(self):
        return self.indicador

    def test_calcula_morosidad_y_la_recalcula(self):
        pk = self.crear()
        self.assertEqual(self.client.get(self.url(pk)).data['indice_morosidad_porcentaje'], Decimal('9.00'))
        r = self.client.patch(self.url(pk), {'monto_cartera_vencida': 500}, format='json')
        self.assertEqual(r.data['indice_morosidad_porcentaje'], Decimal('5.00'))

    def test_cartera_cero(self):
        r = self.client.post(self.url(), {
            **self.cuerpo(), 'monto_cartera_colocada': 0, 'monto_cartera_vencida': 0}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['indice_morosidad_porcentaje'], Decimal('0'))

    def test_periodo_duplicado_400(self):
        r = self.client.post(self.url(), {**self.cuerpo(), 'periodo_corte': '2026-10-31'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_cuadrante_enviado_se_ignora(self):
        r = self.client.post(self.url(), {**self.cuerpo(), 'cuadrante_matriz_2x2': 'VISITAS_MODERADAS'}, format='json')
        # Densidad alta (50 pts de oportunidad + 5) y cartera baja con mora alta.
        self.assertEqual(r.data['cuadrante_matriz_2x2'], 'REFORZAR_POSICION')

    def test_barrio_sigue_al_indicador_mas_reciente(self):
        pk = self.crear()
        self.barrio.refresh_from_db()
        self.assertEqual(self.barrio.estrategia_2x2, 'REFORZAR_POSICION')
        self.client.delete(self.url(pk))
        self.barrio.refresh_from_db()
        self.assertEqual(self.barrio.estrategia_2x2, 'VISITAS_FRECUENTES')

    def test_mover_indicador_de_barrio_actualiza_ambos(self):
        otro = Barrio.objects.create(
            agencia=self.agencia, codigo_inec='110150009', nombre_barrio='El Rosal', parroquia='Sucre',
            canton='Loja', provincia='Loja', latitud_centroide=Decimal('-4'), longitud_centroide=Decimal('-79.2'),
            densidad_poblacional_inec=Decimal('5200'), numero_familias_estimado=1)
        r = self.client.patch(self.url(self.indicador.pk), {'barrio': otro.pk}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.barrio.refresh_from_db()
        otro.refresh_from_db()
        self.assertEqual((self.barrio.estrategia_2x2, otro.estrategia_2x2), ('', 'VISITAS_FRECUENTES'))


class HojaRutaSemanalTests(CrudMixin, APITestCase):
    ruta = 'hojas-ruta'
    parche = {'observaciones': 'Visita reprogramada'}
    invalidos = [
        ('semana_numero', {'semana_numero': 54}), ('semana_numero', {'semana_numero': 0}),
        ('semana_numero', {'semana_numero': 4}), ('tipo_gestion', {'tipo_gestion': 'VISITA'}),
        ('estado', {'estado': 'ANULADA'}), ('oficial_credito', {'oficial_credito': ''}),
    ]

    def cuerpo(self):
        return {'agencia': self.agencia.pk, 'barrio': self.barrio.pk, 'oficial_credito': 'Oficial Loja 02',
                'semana_numero': 3, 'fecha_programada': FECHA_VISITA.isoformat(), 'tipo_gestion': 'COBRANZA',
                'estado': 'PENDIENTE'}

    def objeto(self):
        return self.hoja

    def test_barrio_de_otra_agencia_400(self):
        r = self.client.post(self.url(), {**self.cuerpo(), 'agencia': self.otra_agencia.pk}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('agencia', r.data)

    def test_cumplida_en_el_futuro_400(self):
        futura = timezone.localdate() + timedelta(days=30)
        r = self.client.post(self.url(), {
            **self.cuerpo(), 'fecha_programada': futura.isoformat(),
            'semana_numero': futura.isocalendar().week, 'estado': 'CUMPLIDA'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('estado', r.data)


class ArchivoCargaCSVTests(CrudMixin, APITestCase):
    ruta = 'cargas-csv'
    parche = {'filas_validas': 40}
    invalidos = [
        ('filas_validas', {'filas_validas': 46}), ('filas_con_error', {'filas_con_error': -1}),
        ('nombre_archivo', {'nombre_archivo': 'cartera.xlsx'}), ('tipo_dataset', {'tipo_dataset': 'OTRO'}),
        ('estado_procesamiento', {'estado_procesamiento': 'PROCESADO'}),
    ]

    def cuerpo(self):
        return {'nombre_archivo': 'prospectos.csv', 'tipo_dataset': 'PROSPECTOS', 'total_filas_leidas': 50,
                'filas_validas': 45, 'filas_con_error': 5, 'estado_procesamiento': 'CON_OBSERVACIONES',
                'detalle_errores': 'Filas sin coordenadas'}

    def objeto(self):
        return self.carga


class ParametroAnaliticoTests(CrudMixin, APITestCase):
    ruta = 'parametros'
    parche = {'descripcion': 'Descripción nueva'}
    invalidos = [
        ('clave_parametro', {'clave_parametro': 'con espacios'}),
        ('clave_parametro', {'clave_parametro': 'PARAMETRO_PRUEBA'}),
        ('valor_numerico', {'valor_numerico': -1}), ('valor_numerico', {'valor_numerico': 'abc'}),
        ('valor_numerico', {'valor_numerico': 101}),
    ]

    def cuerpo(self):
        return {'clave_parametro': 'UMBRAL_OPORTUNIDAD', 'descripcion': 'Umbral', 'valor_numerico': 50}

    def objeto(self):
        return self.parametro

    def test_peso_mayor_que_uno_400(self):
        r = self.client.post(self.url(), {
            'clave_parametro': 'PESO_CARTERA', 'descripcion': 'Peso', 'valor_numerico': 1.5}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_umbral_reclasifica_de_inmediato(self):
        self.barrio.refresh_from_db()
        self.assertEqual(self.barrio.estrategia_2x2, 'VISITAS_FRECUENTES')
        pk = self.client.post(self.url(), {
            'clave_parametro': 'PESO_POTENCIALES', 'descripcion': 'Peso', 'valor_numerico': 0}, format='json').data['id']
        self.client.patch('/api/barrios/%s/' % self.barrio.pk, {'densidad_poblacional_inec': 2000}, format='json')
        self.barrio.refresh_from_db()
        self.assertEqual(self.barrio.estrategia_2x2, 'VISITAS_MODERADAS')
        self.client.delete(self.url(pk))
        self.barrio.refresh_from_db()
        self.assertEqual(self.barrio.estrategia_2x2, 'VISITAS_FRECUENTES')


class BitacoraAuditoriaTests(CrudMixin, APITestCase):
    ruta = 'bitacora'
    parche = {'detalle_cambio': 'Detalle corregido'}
    invalidos = [('tipo_evento', {'tipo_evento': 'OTRO'}), ('usuario_responsable', {'usuario_responsable': ''}),
                 ('detalle_cambio', {'detalle_cambio': 'x'})]

    def cuerpo(self):
        return {'usuario_responsable': 'supervisor', 'tipo_evento': 'MODIFICACION',
                'entidad_afectada': 'Barrio', 'detalle_cambio': 'Cambio de densidad'}

    def objeto(self):
        return self.bitacora

    def test_cada_escritura_queda_registrada(self):
        pk = self.client.post('/api/zonas/', {'codigo_zona': 'Z8', 'nombre_zona': 'Zona 8'}, format='json').data['id']
        self.client.patch(f'/api/zonas/{pk}/', {'nombre_zona': 'Zona ocho'}, format='json')
        self.client.delete(f'/api/zonas/{pk}/')
        registros = list(BitacoraAuditoria.objects.filter(entidad_afectada='ZonaComercial').order_by('id'))
        self.assertEqual([r.tipo_evento for r in registros], ['CREACION', 'MODIFICACION', 'ELIMINACION'])
        self.assertIn('Zona 8 → Zona ocho', registros[1].detalle_cambio)
        for r in registros:
            self.assertIn(f'ID {pk} | IP 127.0.0.1', r.detalle_cambio)

    def test_eventos_especificos(self):
        self.client.patch(f'/api/parametros/{self.parametro.pk}/', {'valor_numerico': 2}, format='json')
        self.assertEqual(BitacoraAuditoria.objects.first().tipo_evento, 'AJUSTE_PARAMETRO')
        self.client.post('/api/cargas-csv/', {
            'nombre_archivo': 'a.csv', 'tipo_dataset': 'CENSO_INEC', 'total_filas_leidas': 1,
            'filas_validas': 1, 'estado_procesamiento': 'PROCESADO'}, format='json')
        self.assertEqual(BitacoraAuditoria.objects.first().tipo_evento, 'CARGA_CSV')

    def test_usuario_autenticado(self):
        usuario = get_user_model().objects.create_user('jefe.agencia')
        self.client.force_authenticate(usuario)
        self.client.patch(f'/api/zonas/{self.zona.pk}/', {'descripcion': 'x'}, format='json')
        self.assertEqual(BitacoraAuditoria.objects.first().usuario_responsable, 'jefe.agencia')

    def test_rechazo_no_deja_registro(self):
        antes = BitacoraAuditoria.objects.count()
        self.client.post('/api/zonas/', {}, format='json')
        self.client.delete(f'/api/zonas/{self.zona.pk}/')
        self.assertEqual(BitacoraAuditoria.objects.count(), antes)


class MatrizTests(TestCase):
    """Los cuatro cuadrantes del CU-005 con los parámetros por defecto."""

    def evaluar(self, densidad, potenciales, cartera, mora):
        return matriz.evaluar(Decimal(densidad), potenciales, Decimal(cartera), Decimal(mora),
                              matriz.obtener_parametros())

    def test_cuadrantes(self):
        casos = [
            ((5000, 100, 30000, 2), 'VISITAS_FRECUENTES'),
            ((5000, 100, 5000, 9), 'REFORZAR_POSICION'),
            ((500, 10, 30000, 2), 'VISITAS_MODERADAS'),
            ((500, 10, 5000, 9), 'VISITAS_MINIMAS'),
            ((5000, 100, 0, 0), 'REFORZAR_POSICION'),  # sin cartera no hay posicionamiento
            ((2500, 50, 0, 0), 'REFORZAR_POSICION'),   # el umbral exacto cuenta como Alta
        ]
        for datos, esperado in casos:
            with self.subTest(datos=datos):
                self.assertEqual(self.evaluar(*datos)[0], esperado)

    def test_alerta_costo_operativo(self):
        self.assertIn('ALERTA', self.evaluar(300, 5, 5000, 12)[1])
        self.assertNotIn('ALERTA', self.evaluar(300, 5, 5000, 5)[1])

    def test_pesos_o_referencias_en_cero_no_fallan(self):
        for clave in ('PESO_CARTERA', 'PESO_MOROSIDAD', 'REF_CARTERA', 'MOROSIDAD_MAXIMA', 'REF_DENSIDAD'):
            ParametroAnalitico.objects.create(clave_parametro=clave, descripcion='cero', valor_numerico=0)
        self.assertIn(self.evaluar(100, 10, 5000, 2)[0], matriz.ESTRATEGIAS)


class ModelosTests(DatosBase, TestCase):
    """Las mismas reglas se aplican en full_clean() (panel de administración)."""

    def test_coordenadas(self):
        self.barrio.latitud_centroide = Decimal('-5.1')
        self.barrio.longitud_centroide = Decimal('-92.1')
        with self.assertRaises(ValidationError) as e:
            self.barrio.full_clean()
        self.assertEqual(set(e.exception.message_dict), {'latitud_centroide', 'longitud_centroide'})

    def test_cartera_vencida(self):
        self.indicador.monto_cartera_vencida = Decimal('40001')
        with self.assertRaises(ValidationError):
            self.indicador.full_clean()

    def test_filas_csv(self):
        self.carga.filas_validas = 99
        with self.assertRaises(ValidationError):
            self.carga.full_clean()

    def test_hoja_ruta(self):
        self.hoja.agencia = self.otra_agencia
        with self.assertRaises(ValidationError):
            self.hoja.full_clean()


class ResumenKpisTests(APITestCase):
    URL = '/api/indicadores/resumen-kpis/'

    @classmethod
    def setUpTestData(cls):
        call_command('cargar_datos_coac', stdout=StringIO())

    def test_consolidado_usa_ultimo_corte(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        ultimos = IndicadorBarrio.objects.filter(periodo_corte=date(2026, 10, 31))
        self.assertEqual(r.data['total_barrios'], Barrio.objects.count())
        self.assertEqual(r.data['cartera_total_colocada'], sum(i.monto_cartera_colocada for i in ultimos))
        self.assertEqual(r.data['numero_creditos'], sum(i.numero_creditos_activos for i in ultimos))
        self.assertEqual(sum(r.data['distribucion_matriz_2x2'].values()), r.data['total_barrios'])
        self.assertTrue(all(r.data['distribucion_matriz_2x2'].values()), 'Los 4 cuadrantes deben tener barrios')
        self.assertEqual(len(r.data['por_zona']), 4)
        self.assertEqual(sum(z['cartera_total_colocada'] for z in r.data['por_zona']),
                         r.data['cartera_total_colocada'])
        self.assertEqual(len(r.data['puntos_mapa_calor']), r.data['total_barrios'])
        self.assertEqual(r.data['linea_base']['cartera_total'], Decimal('43998961'))
        self.assertEqual(r.data['linea_base']['numero_creditos'], 18813)
        self.assertEqual(r.data['linea_base']['total_barrios'], 1852)

    def test_promedio_catamayo_coincide_con_requisito(self):
        agencia = Agencia.objects.get(nombre_agencia='Catamayo')
        r = self.client.get(self.URL, {'agencia': agencia.pk})
        self.assertEqual(r.data['cartera_promedio_por_barrio'], Decimal('49582'))

    def test_todos_los_filtros(self):
        loja = Barrio.objects.get(nombre_barrio='San Sebastián')
        casos = [
            ({'zona': loja.agencia.zona_id}, 5), ({'agencia': loja.agencia_id}, 5), ({'barrio': loja.pk}, 1),
            ({'canton': 'pasaje'}, 2), ({'parroquia': 'San Sebastián'}, 4),
            ({'oficial_credito': 'Oficial Loja 01'}, 5), ({'periodo': '2026-09-30'}, 24),
            ({'actividad_economica': 'COMERCIO', 'barrio': loja.pk}, 1),
            ({'actividad_economica': 'SERVICIOS', 'barrio': loja.pk}, 0),
        ]
        for filtros, esperado in casos:
            with self.subTest(filtros=filtros):
                r = self.client.get(self.URL, filtros)
                self.assertEqual(r.status_code, 200)
                self.assertEqual(r.data['total_barrios'], esperado)

    def test_filtro_cuadrante(self):
        r = self.client.get(self.URL, {'cuadrante': 'VISITAS_MINIMAS'})
        self.assertEqual({p['cuadrante'] for p in r.data['puntos_mapa_calor']}, {'VISITAS_MINIMAS'})

    def test_sin_coincidencias_kpis_en_cero(self):
        r = self.client.get(self.URL, {'canton': 'Quito'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.data['total_barrios'], r.data['cartera_total_colocada'],
                          r.data['indice_morosidad_porcentaje'], r.data['puntos_mapa_calor']), (0, 0, 0, []))

    def test_filtro_invalido_400(self):
        for filtros in ({'zona': 'norte'}, {'periodo': 'hoy'}, {'cuadrante': 'OTRO'}):
            self.assertEqual(self.client.get(self.URL, filtros).status_code, 400)

    def test_consultas_constantes(self):
        with self.assertNumQueries(6):
            self.client.get(self.URL)

    def test_semilla_idempotente_y_valida(self):
        modelos = (ZonaComercial, Agencia, Barrio, PotencialSocio, IndicadorBarrio, HojaRutaSemanal,
                   ArchivoCargaCSV, ParametroAnalitico, PerfilUsuario, BitacoraAuditoria)
        antes = [m.objects.count() for m in modelos]
        call_command('cargar_datos_coac', stdout=StringIO())
        self.assertEqual([m.objects.count() for m in modelos], antes)
        for m in modelos:
            for obj in m.objects.all():
                if not (m is HojaRutaSemanal and obj.fecha_programada > timezone.localdate()):
                    obj.full_clean()


class PlataformaTests(DatosBase, APITestCase):
    def test_swagger_y_esquema_200(self):
        self.assertEqual(self.client.get('/api/docs/').status_code, 200)
        r = self.client.get('/api/schema/', {'format': 'json'})
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, '/api/indicadores/resumen-kpis/')

    def test_cors(self):
        for origen in ('http://localhost:8100', 'http://localhost:4200', 'https://localhost', 'http://localhost'):
            r = self.client.get('/api/zonas/', headers={'origin': origen})
            self.assertEqual(r.headers.get('access-control-allow-origin'), origen)
        r = self.client.get('/api/zonas/', headers={'origin': 'http://malicioso.example'})
        self.assertNotIn('access-control-allow-origin', r.headers)

    def test_admin_todas_las_paginas(self):
        self.client.force_login(get_user_model().objects.create_superuser('admin'))
        for modelo, modelo_admin in admin.site._registry.items():
            if modelo._meta.app_label != 'geoheat':
                continue
            base = f'/admin/geoheat/{modelo._meta.model_name}/'
            obj = modelo.objects.first()
            self.assertEqual(self.client.get(base, {'q': 'a'}).status_code, 200, base)
            self.assertEqual(self.client.get(f'{base}{obj.pk}/change/').status_code, 200, base)
            esperado = 403 if modelo is BitacoraAuditoria else 200
            self.assertEqual(self.client.get(f'{base}add/').status_code, esperado, base)

    def test_admin_guarda_calcula_y_audita(self):
        self.client.force_login(get_user_model().objects.create_superuser('admin'))
        base = {'barrio': self.barrio.pk, 'periodo_corte': '2026-11-30', 'monto_cartera_colocada': '1000',
                'numero_creditos_activos': 1, 'indice_morosidad_porcentaje': '',
                'total_socios_activos': 1, 'total_potenciales_socios': 1}
        url = '/admin/geoheat/indicadorbarrio/add/'
        r = self.client.post(url, {**base, 'monto_cartera_vencida': '2000'})
        self.assertEqual(r.status_code, 200)  # el formulario vuelve con el error
        r = self.client.post(url, {**base, 'monto_cartera_vencida': '50'})
        self.assertEqual(r.status_code, 302)
        creado = IndicadorBarrio.objects.get(periodo_corte=date(2026, 11, 30))
        self.assertEqual(creado.indice_morosidad_porcentaje, Decimal('5'))
        registro = BitacoraAuditoria.objects.first()
        self.assertEqual((registro.usuario_responsable, registro.tipo_evento), ('admin', 'CREACION'))

        r = self.client.post(f'/admin/geoheat/indicadorbarrio/{creado.pk}/delete/', {'post': 'yes'})
        self.assertEqual(r.status_code, 302)
        self.assertEqual(BitacoraAuditoria.objects.first().tipo_evento, 'ELIMINACION')

    def test_admin_inline_hoja_ruta_invalida_no_falla(self):
        self.client.force_login(get_user_model().objects.create_superuser('admin'))
        datos = {
            'agencia': self.agencia.pk, 'codigo_inec': '110150001', 'nombre_barrio': 'San Sebastián',
            'parroquia': 'San Sebastián', 'canton': 'Loja', 'provincia': 'Loja', 'latitud_centroide': '-4',
            'longitud_centroide': '-79.2', 'densidad_poblacional_inec': '5200', 'numero_familias_estimado': '1',
            'hojas_ruta-0-agencia': self.otra_agencia.pk, 'hojas_ruta-0-oficial_credito': 'Oficial',
            'hojas_ruta-0-semana_numero': '3', 'hojas_ruta-0-fecha_programada': '12/01/2026',
            'hojas_ruta-0-tipo_gestion': 'COBRANZA', 'hojas_ruta-0-estado': 'PENDIENTE',
            'hojas_ruta-0-barrio': self.barrio.pk,
        }
        for prefijo, total in (('indicadores', 0), ('potenciales_socios', 0), ('hojas_ruta', 1)):
            datos |= {f'{prefijo}-TOTAL_FORMS': total, f'{prefijo}-INITIAL_FORMS': 0}
        r = self.client.post(f'/admin/geoheat/barrio/{self.barrio.pk}/change/', datos)
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, 'no pertenece a la agencia')


class UsuarioTests(CrudMixin, APITestCase):
    ruta = 'usuarios'
    parche = {'rol': 'JEFE_AGENCIA', 'first_name': 'Nombre nuevo'}
    invalidos = [
        ('rol', {'rol': 'GERENTE'}), ('username', {'username': 'OFICIAL.prueba'}),
        ('username', {'username': 'con espacios'}), ('email', {'email': 'no-es-correo'}),
        ('email', {'email': 'OFICIAL@geoheat.example'}), ('password', {'password': '12345678'}),
        ('agencia', {'agencia': 999999}),
    ]

    def cuerpo(self):
        return {'username': 'nuevo.usuario', 'email': 'nuevo@geoheat.example', 'first_name': 'Nuevo',
                'last_name': 'Usuario', 'password': CLAVE, 'rol': 'ADMIN', 'agencia': self.agencia.pk}

    def objeto(self):
        return self.perfil

    def test_sin_clave_400(self):
        cuerpo = self.cuerpo()
        del cuerpo['password']
        r = self.client.post(self.url(), cuerpo, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('password', r.data)

    def test_clave_cifrada_y_nunca_expuesta(self):
        r = self.client.post(self.url(), self.cuerpo(), format='json')
        self.assertNotIn('password', r.data)
        usuario = get_user_model().objects.get(username='nuevo.usuario')
        self.assertNotEqual(usuario.password, CLAVE)
        self.assertTrue(usuario.check_password(CLAVE))

    def test_no_concede_privilegios_de_django(self):
        self.client.post(self.url(), {**self.cuerpo(), 'is_staff': True, 'is_superuser': True}, format='json')
        usuario = get_user_model().objects.get(username='nuevo.usuario')
        self.assertEqual((usuario.is_staff, usuario.is_superuser), (False, False))

    def test_superusuario_fuera_de_la_api_404(self):
        raiz = get_user_model().objects.create_superuser('raiz', password=CLAVE)
        perfil = PerfilUsuario.objects.create(usuario=raiz, rol='ADMIN')
        self.assertEqual(self.client.get(self.url(perfil.pk)).status_code, 404)
        self.assertEqual(
            self.client.patch(self.url(perfil.pk), {'password': CLAVE + 'x'}, format='json').status_code, 404)
        self.assertEqual(self.client.delete(self.url(perfil.pk)).status_code, 404)

    def test_put_sin_clave_la_conserva(self):
        cuerpo = {**self.cuerpo(), 'username': 'oficial.prueba', 'email': 'oficial@geoheat.example'}
        del cuerpo['password']
        r = self.client.put(self.url(self.perfil.pk), cuerpo, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password(CLAVE))

    def test_bloqueo_es_solo_lectura(self):
        self.client.patch(self.url(self.perfil.pk), {'intentos_fallidos': 3}, format='json')
        self.perfil.refresh_from_db()
        self.assertEqual(self.perfil.intentos_fallidos, 0)

    def test_bitacora_no_expone_la_clave(self):
        nueva = secrets.token_urlsafe(16)
        self.client.patch(self.url(self.perfil.pk), {'password': nueva, 'rol': 'ADMIN'}, format='json')
        detalle = BitacoraAuditoria.objects.first().detalle_cambio
        self.assertIn('password (dato protegido)', detalle)
        self.assertIn('rol: OFICIAL_CREDITO → ADMIN', detalle)
        self.assertNotIn(nueva, detalle)
        self.assertNotIn('pbkdf2', detalle)

    def test_eliminar_borra_tambien_la_cuenta(self):
        self.client.delete(self.url(self.perfil.pk))
        self.assertFalse(get_user_model().objects.filter(username='oficial.prueba').exists())


class LoginTests(DatosBase, APITestCase):
    URL = '/api/auth/login/'

    def entrar(self, clave=CLAVE, username='oficial.prueba'):
        return self.client.post(self.URL, {'username': username, 'password': clave}, format='json')

    def eventos(self):
        return list(BitacoraAuditoria.objects.filter(entidad_afectada='PerfilUsuario')
                    .order_by('id').values_list('tipo_evento', flat=True))

    def test_exitoso_200(self):
        r = self.entrar()
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual((r.data['rol'], r.data['agencia_nombre']), ('OFICIAL_CREDITO', 'Oficina Norte'))
        self.assertEqual(self.eventos(), ['ACCESO'])

    def test_por_correo_200(self):
        self.assertEqual(self.entrar(username='Oficial@geoheat.example').status_code, 200)

    def test_token_identifica_al_usuario_en_la_bitacora(self):
        token = self.entrar().data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.client.patch(f'/api/zonas/{self.zona.pk}/', {'descripcion': 'x'}, format='json')
        self.assertEqual(BitacoraAuditoria.objects.first().usuario_responsable, 'oficial.prueba')

    def test_token_invalido_401_pero_no_impide_entrar(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer falso')
        self.assertEqual(self.client.get('/api/zonas/').status_code, 401)
        self.assertEqual(self.entrar().status_code, 200)

    def test_cambiar_clave_invalida_el_token(self):
        token = self.entrar().data['token']
        self.usuario.set_password(CLAVE + 'x')
        self.usuario.save()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(self.client.get('/api/zonas/').status_code, 401)

    def test_credenciales_invalidas_401(self):
        mala, inexistente = self.entrar('mala'), self.entrar('mala', 'nadie')
        self.assertEqual((mala.status_code, inexistente.status_code), (401, 401))
        self.assertEqual(mala.data, inexistente.data)  # no revela si el usuario existe
        self.assertEqual(self.eventos(), ['ACCESO_FALLIDO', 'ACCESO_FALLIDO'])

    def test_campos_faltantes_400(self):
        self.assertEqual(self.client.post(self.URL, {}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.URL, {'username': 'a'}, format='json').status_code, 400)

    def test_tres_fallos_bloquean_403(self):
        self.assertEqual([self.entrar('mala').status_code for _ in range(3)], [401, 401, 401])
        self.assertEqual(self.entrar().status_code, 403)  # ni con la clave correcta
        self.assertEqual(self.entrar('mala').status_code, 403)
        self.assertEqual(self.eventos(), ['ACCESO_FALLIDO'] * 3 + ['BLOQUEO_CUENTA'] + ['ACCESO_FALLIDO'] * 2)
        self.perfil.refresh_from_db()
        restante = self.perfil.bloqueado_hasta - timezone.now()
        self.assertTrue(timedelta(minutes=14) < restante <= timedelta(minutes=15))

    def test_bloqueo_vence_a_los_15_minutos(self):
        for _ in range(3):
            self.entrar('mala')
        futuro = timezone.now() + timedelta(minutes=15, seconds=1)
        with patch('django.utils.timezone.now', return_value=futuro):
            self.assertEqual(self.entrar('mala').status_code, 401)
            self.perfil.refresh_from_db()
            self.assertEqual((self.perfil.intentos_fallidos, self.perfil.bloqueado_hasta), (1, None))
            self.assertEqual(self.entrar().status_code, 200)

    def test_exito_reinicia_el_contador(self):
        for clave in ('mala', 'mala', CLAVE, 'mala', 'mala'):
            ultimo = self.entrar(clave)
        self.assertEqual(ultimo.status_code, 401)
        self.assertEqual(self.entrar().status_code, 200)

    def test_cuenta_inactiva_401(self):
        self.usuario.is_active = False
        self.usuario.save()
        self.assertEqual(self.entrar().status_code, 401)

    def test_superusuario_entra_como_admin_y_usuario_sin_rol_no(self):
        get_user_model().objects.create_superuser('raiz', password=CLAVE)
        get_user_model().objects.create_user('sin.rol', password=CLAVE)
        self.assertEqual(self.entrar(username='raiz').data['rol'], 'ADMIN')
        self.assertEqual(self.entrar(username='sin.rol').status_code, 401)

    def test_basic_no_evade_el_bloqueo(self):
        import base64
        for _ in range(3):
            self.entrar('mala')
        basica = base64.b64encode(f'oficial.prueba:{CLAVE}'.encode()).decode()
        self.client.patch(f'/api/zonas/{self.zona.pk}/', {'descripcion': 'x'}, format='json',
                          headers={'authorization': f'Basic {basica}'})
        self.assertEqual(BitacoraAuditoria.objects.first().usuario_responsable, 'anónimo')

    def test_admin_desbloquea(self):
        for _ in range(3):
            self.entrar('mala')
        self.client.force_login(get_user_model().objects.create_superuser('raiz'))
        r = self.client.post('/admin/geoheat/perfilusuario/', {
            'action': 'desbloquear', '_selected_action': [self.perfil.pk]})
        self.assertEqual(r.status_code, 302)
        self.assertEqual(self.entrar().status_code, 200)

    def test_usuarios_semilla_uno_por_rol(self):
        with override_settings(DEMO_USERS_PASSWORD=CLAVE):
            call_command('cargar_datos_coac', stdout=StringIO())
        for username, rol in (('admin.geoheat', 'ADMIN'), ('jefe.agencia', 'JEFE_AGENCIA'),
                              ('oficial.credito', 'OFICIAL_CREDITO'),
                              ('supervisor.metodologico', 'SUPERVISOR_METODOLOGICO')):
            self.assertEqual(self.entrar(username=username).data['rol'], rol)

    @override_settings(DEMO_USERS_PASSWORD='')
    def test_semilla_sin_clave_no_permite_entrar(self):
        call_command('cargar_datos_coac', stdout=StringIO())
        self.assertEqual(self.entrar(username='admin.geoheat').status_code, 401)


CABECERA = 'codigo_inec,nombre_barrio,cartera_colocada,creditos_activos,cartera_vencida'
CABECERA_NUEVO = CABECERA + (',agencia,parroquia,canton,provincia,latitud,longitud,'
                             'densidad_poblacional_inec,numero_familias_estimado')


class ProcesarCSVTests(DatosBase, APITestCase):
    URL = '/api/cargas-csv/procesar/'

    def enviar(self, *filas, cabecera=CABECERA, **extra):
        return self.client.post(self.URL, {'contenido': '\n'.join([cabecera, *filas]), **extra}, format='json')

    def assertRechazada(self, fila, motivo, cabecera=CABECERA):
        r = self.enviar(fila, cabecera=cabecera)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['estado_procesamiento'], 'FALLIDO', r.data)
        self.assertIn(motivo, r.data['detalle_errores'])

    def test_archivo_multipart_201(self):
        archivo = SimpleUploadedFile(
            'cartera.csv', f'\ufeff{CABECERA}\r\n110150001,SAN  SEBASTIAN,50000.50,20,1000\r\n'.encode(), 'text/csv')
        r = self.client.post(self.URL, {'archivo': archivo, 'periodo_corte': '2026-01-31'}, format='multipart')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(
            (r.data['nombre_archivo'], r.data['estado_procesamiento'], r.data['filas_validas'],
             r.data['indicadores_creados']), ('cartera.csv', 'PROCESADO', 1, 1))
        ind = IndicadorBarrio.objects.get(barrio=self.barrio, periodo_corte=date(2026, 1, 31))
        self.assertEqual((ind.monto_cartera_colocada, ind.numero_creditos_activos, ind.indice_morosidad_porcentaje),
                         (Decimal('50000.50'), 20, Decimal('2.00')))
        self.barrio.refresh_from_db()
        self.assertEqual(self.barrio.nombre_barrio, 'San Sebastián')  # conserva las tildes oficiales
        self.assertEqual(BitacoraAuditoria.objects.first().tipo_evento, 'CARGA_CSV')

    def test_texto_plano_csv_201(self):
        r = self.client.post(
            self.URL, f'{CABECERA}\n110150001,San Sebastián,50000,20,1000'.encode(), content_type='text/csv')
        self.assertEqual(r.status_code, 201, r.data)

    def test_actualiza_indicador_existente_y_matriz(self):
        r = self.enviar('110150001,San Sebastián,1000,1,900', periodo_corte='2026-10-31')
        self.assertEqual((r.data['indicadores_creados'], r.data['indicadores_actualizados']), (0, 1))
        self.indicador.refresh_from_db()
        self.assertEqual(self.indicador.monto_cartera_vencida, 900)
        self.assertEqual(self.indicador.total_potenciales_socios, 120)  # lo no informado se conserva
        self.assertEqual(self.indicador.cuadrante_matriz_2x2, 'REFORZAR_POSICION')
        self.barrio.refresh_from_db()
        self.assertEqual(self.barrio.estrategia_2x2, 'REFORZAR_POSICION')
        self.assertEqual(IndicadorBarrio.objects.count(), 1)

    def test_mismo_resultado_que_guardar_por_el_modelo(self):
        self.enviar('110150001,San Sebastián,8000,3,750', periodo_corte='2026-02-28')
        ind = IndicadorBarrio.objects.get(periodo_corte=date(2026, 2, 28))
        antes = (ind.indice_morosidad_porcentaje, ind.cuadrante_matriz_2x2, ind.estrategia_sugerida)
        ind.indice_morosidad_porcentaje = None
        ind.save()
        self.assertEqual((ind.indice_morosidad_porcentaje, ind.cuadrante_matriz_2x2, ind.estrategia_sugerida), antes)
        ind.full_clean()

    def test_hereda_socios_del_corte_anterior_no_del_futuro(self):
        self.enviar('110150001,San Sebastián,8000,3,0', periodo_corte='2026-11-01')
        self.enviar('110150001,San Sebastián,8000,3,0', periodo_corte='2026-01-01')
        self.assertEqual(
            list(IndicadorBarrio.objects.order_by('periodo_corte').values_list('total_socios_activos', flat=True)),
            [0, 90, 90])

    def test_aisla_filas_invalidas_sin_interrumpir(self):
        r = self.enviar(
            '110150001,San Sebastián,1000,1,2000', '110150001,San Sebastián,abc,1,0',
            '110150001,San Sebastián,1000,1,100', '999999,Otro,1,1,0')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(
            (r.data['estado_procesamiento'], r.data['total_filas_leidas'], r.data['filas_validas'],
             r.data['filas_con_error']), ('CON_OBSERVACIONES', 4, 1, 3))
        lineas = r.data['detalle_errores'].splitlines()
        self.assertEqual([x.split(':')[0] for x in lineas], ['Fila 2', 'Fila 3', 'Fila 5'])
        descarga = self.client.get(f'/api/cargas-csv/{r.data["id"]}/errores/')
        self.assertEqual(descarga.status_code, 200)
        self.assertTrue(descarga['Content-Type'].startswith('text/csv'))
        self.assertEqual(len(descarga.content.decode().splitlines()), 4)

    def test_montos_y_enteros_invalidos(self):
        for monto in ('-1', 'NaN', 'inf', '1e5', '1.234', '1000000000000', '٣'):
            self.assertRechazada(f'110150001,San Sebastián,{monto},1,0', 'cartera_colocada')
        for creditos in ('-1', '1.5', 'x', '99999999999'):
            self.assertRechazada(f'110150001,San Sebastián,100,{creditos},0', 'creditos_activos')
        self.assertRechazada('110150001,San Sebastián,100,1,101', 'vencida no puede superar')
        self.assertRechazada('110150001,San Sebastián,,1,0', 'campos vacíos: cartera_colocada')
        self.assertRechazada('110150001,San Sebastián,100', 'campos vacíos')
        self.assertRechazada('110150001,San Sebastián,100,1,0,sobra', 'más valores')
        self.assertEqual(IndicadorBarrio.objects.count(), 1)

    def test_formatos_de_monto(self):
        r = self.enviar('110150001;San Sebastián;"1500,75";3;"0,5"', cabecera=CABECERA.replace(',', ';'),
                        periodo_corte='2026-03-31')
        self.assertEqual(r.data['estado_procesamiento'], 'PROCESADO', r.data)
        self.assertEqual(IndicadorBarrio.objects.get(periodo_corte='2026-03-31').monto_cartera_colocada, Decimal('1500.75'))
        self.assertEqual(etl.a_monto('$43,998,961', 'x'), 43998961)

    def test_coordenadas_invalidas(self):
        cabecera = CABECERA + ',latitud,longitud'
        for lat, lon in (('-5.1', '-79'), ('-4', '-74'), ('abc', '-79'), ('NaN', '-79'), ('Infinity', '-79')):
            self.assertRechazada(f'110150001,San Sebastián,100,1,0,{lat},{lon}', 'itud', cabecera)
        self.assertRechazada('110150001,San Sebastián,100,1,0,,-79', 'campos vacíos: latitud', cabecera)
        self.barrio.refresh_from_db()
        self.assertEqual(self.barrio.latitud_centroide, Decimal('-4'))

    def test_coordenadas_validas_reubican(self):
        r = self.enviar('110150001,San Sebastián,100,1,0,-4.0012345678,-79.21', cabecera=CABECERA + ',latitud,longitud')
        self.assertEqual(r.data['estado_procesamiento'], 'PROCESADO', r.data)
        self.barrio.refresh_from_db()
        self.assertEqual(self.barrio.latitud_centroide, Decimal('-4.001235'))

    def test_codigo_que_no_corresponde_al_nombre(self):
        self.assertRechazada('110150001,La Pradera,100,1,0', 'no corresponde al código')

    def test_duplicados_en_el_archivo(self):
        r = self.enviar('110150001,San Sebastián,100,1,0', '110150001,San Sebastián,200,1,0')
        self.assertIn('Fila 3: duplica el barrio y período de la fila 2', r.data['detalle_errores'])

    def test_crea_barrio_nuevo_normalizado(self):
        fila = '70950001,LOMA   DE FRANCO,9000,4,100,catamayo,PASAJE,pasaje,el oro,-3.33,-79.8,4900,870'
        r = self.enviar(fila, cabecera=CABECERA_NUEVO)
        self.assertEqual((r.data['estado_procesamiento'], r.data['barrios_creados']), ('PROCESADO', 1), r.data)
        barrio = Barrio.objects.get(codigo_inec='70950001')
        self.assertEqual((barrio.nombre_barrio, barrio.parroquia, barrio.provincia, barrio.agencia),
                         ('Loma de Franco', 'Pasaje', 'El Oro', self.otra_agencia))
        self.assertTrue(barrio.estrategia_2x2)
        barrio.full_clean()

    def test_barrio_nuevo_invalido(self):
        base = '110150077,Nuevo,9000,4,100,{},Sucre,Loja,{},-4,-79.2,4900,870'
        self.assertRechazada(base.format('Quito', 'Loja'), 'agencia', CABECERA_NUEVO)
        self.assertRechazada(base.format('Catamayo', 'Pichincha'), 'provincia', CABECERA_NUEVO)
        self.assertFalse(Barrio.objects.filter(codigo_inec='110150077').exists())

    def test_cero_inicial_perdido_por_excel(self):
        Barrio.objects.filter(pk=self.barrio.pk).update(codigo_inec='070950001')
        r = self.enviar('70950001,San Sebastián,100,1,0')
        self.assertEqual(r.data['estado_procesamiento'], 'PROCESADO', r.data)

    def test_periodo_por_fila(self):
        cabecera = CABECERA + ',periodo_corte'
        r = self.enviar('110150001,San Sebastián,100,1,0,2026-04-30', '110150001,San Sebastián,100,1,0,2026-05-31',
                        cabecera=cabecera)
        self.assertEqual(r.data['indicadores_creados'], 2, r.data)
        self.assertRechazada('110150001,San Sebastián,100,1,0,30/04/2026', 'periodo_corte', cabecera)
        self.assertRechazada('110150001,San Sebastián,100,1,0,2026-02-31', 'periodo_corte', cabecera)
        self.assertRechazada('110150001,San Sebastián,100,1,0,2999-01-01', 'futura', cabecera)

    def test_faltan_cabeceras_400(self):
        antes = ArchivoCargaCSV.objects.count()
        r = self.enviar('110150001,100', cabecera='codigo_inec,cartera_colocada')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data['columnas_faltantes'], ['nombre_barrio', 'creditos_activos', 'cartera_vencida'])
        self.assertEqual(ArchivoCargaCSV.objects.count(), antes)

    def test_entradas_invalidas_400(self):
        def subir(nombre, contenido):
            return self.client.post(
                self.URL, {'archivo': SimpleUploadedFile(nombre, contenido)}, format='multipart').status_code
        self.assertEqual(subir('a.xlsx', CABECERA.encode()), 400)
        self.assertEqual(subir('a.csv', b''), 400)
        self.assertEqual(subir('a.csv', (CABECERA + '\n1,Pi\u00f1as,1,1,1').encode('latin-1')), 400)
        self.assertEqual(self.client.post(self.URL, {}, format='json').status_code, 400)
        self.assertEqual(self.enviar().status_code, 400)  # solo cabecera
        self.assertEqual(self.enviar('x', cabecera=CABECERA + ',Codigo INEC').status_code, 400)  # repetida
        self.assertEqual(self.enviar('x', periodo_corte='2999-01-01').status_code, 400)
        self.assertEqual(self.enviar('x', nombre_archivo='a.txt').status_code, 400)
        self.assertEqual(self.client.post(self.URL, b'\xff\xfe', content_type='text/csv').status_code, 400)
        with patch.object(etl, 'MAX_FILAS', 1):
            self.assertEqual(self.enviar('x', 'y').status_code, 400)

    def test_texto_mayor_que_el_limite_por_defecto_de_django(self):
        relleno = ['110150001,San Sebastián,100,1,0,' + 'x' * 1000] * 3000  # ~3 MB
        self.assertEqual(self.enviar(*relleno, cabecera=CABECERA + ',nota').status_code, 201)

    def test_errores_de_carga_inexistente_404(self):
        self.assertEqual(self.client.get('/api/cargas-csv/999999/errores/').status_code, 404)


class ReporteCumplimientoTests(APITestCase):
    URL = '/api/rutas/reporte-cumplimiento/'

    @classmethod
    def setUpTestData(cls):
        call_command('cargar_datos_coac', stdout=StringIO())

    def test_global_y_desgloses(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['total_rutas'], 9)
        self.assertEqual(r.data['por_estado'], {'PENDIENTE': 3, 'EN_CURSO': 1, 'CUMPLIDA': 4, 'INCUMPLIDA': 1})
        self.assertEqual((r.data['porcentaje_cumplimiento'], r.data['porcentaje_sobre_cerradas']), (44.44, 80.0))
        self.assertEqual({o['oficial_credito']: (o['total_rutas'], o['porcentaje_cumplimiento'])
                          for o in r.data['por_oficial']},
                         {'Oficial Loja 01': (5, 80.0), 'Oficial Catamayo 01': (2, 0.0), 'Oficial Piñas 01': (2, 0.0)})
        self.assertEqual(sum(a['total_rutas'] for a in r.data['por_agencia']), 9)
        self.assertIn('El Capulí', [x['nombre_barrio'] for x in r.data['visitas_no_realizadas']])
        self.assertEqual(len(r.data['variacion_por_barrio']), 4)
        san_sebastian = next(x for x in r.data['variacion_por_barrio'] if x['nombre_barrio'] == 'San Sebastián')
        self.assertEqual((san_sebastian['variacion_cartera'], san_sebastian['variacion_morosidad']),
                         (Decimal('1648.00'), Decimal('-0.40')))

    def test_disponible_tambien_en_hojas_ruta(self):
        self.assertEqual(self.client.get('/api/hojas-ruta/reporte-cumplimiento/').data, self.client.get(self.URL).data)

    def test_filtros(self):
        agencia = Agencia.objects.get(nombre_agencia='Piñas')
        for filtros, esperado in (({'agencia': agencia.pk}, 2), ({'oficial_credito': 'oficial loja 01'}, 5),
                                  ({'semana_numero': 47}, 5), ({'desde': '2026-11-23', 'hasta': '2026-11-30'}, 2)):
            self.assertEqual(self.client.get(self.URL, filtros).data['total_rutas'], esperado, filtros)

    def test_sin_rutas_en_cero(self):
        r = self.client.get(self.URL, {'desde': '2000-01-01', 'hasta': '2000-01-02'})
        self.assertEqual((r.status_code, r.data['total_rutas'], r.data['porcentaje_cumplimiento'],
                          r.data['por_oficial']), (200, 0, 0, []))

    def test_filtro_invalido_400(self):
        for filtros in ({'agencia': 'x'}, {'semana_numero': 60}, {'desde': '2026-02-02', 'hasta': '2026-01-01'}):
            self.assertEqual(self.client.get(self.URL, filtros).status_code, 400)

    def test_resalta_visita_vencida_sin_marcar(self):
        hoja = HojaRutaSemanal.objects.filter(estado='PENDIENTE').first()
        HojaRutaSemanal.objects.filter(pk=hoja.pk).update(fecha_programada=date(2020, 1, 6))
        ids = [x['id'] for x in self.client.get(self.URL).data['visitas_no_realizadas']]
        self.assertIn(hoja.pk, ids)


class ProyeccionExpansionTests(APITestCase):
    URL = '/api/indicadores/proyeccion-expansion/'

    @classmethod
    def setUpTestData(cls):
        call_command('cargar_datos_coac', stdout=StringIO())

    def test_ranking(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['total_barrios'], 24)
        scores = [f['score_crecimiento'] for f in r.data['ranking']]
        self.assertEqual(scores, sorted(scores, reverse=True))
        self.assertTrue(all(0 <= x <= 100 for x in scores))
        self.assertEqual([f['posicion'] for f in r.data['ranking']], list(range(1, 25)))
        self.assertEqual({f['recomendacion'] for f in r.data['ranking']},
                         {'BRIGADA_PRIORITARIA', 'BRIGADA_PROGRAMADA', 'SEGUIMIENTO'})
        self.assertEqual(sum(f['demanda_proyectada'] for f in r.data['ranking']), r.data['demanda_total_proyectada'])

    def test_formula(self):
        fila = next(f for f in self.client.get(self.URL).data['ranking'] if f['nombre_barrio'] == 'La Pradera')
        # 0,30·(4600/5000) + 0,40·(95/100) + 0,30·(1 − 3,20/10) = 0,86
        self.assertEqual(fila['score_crecimiento'], Decimal('86.00'))
        # Prospectos de La Pradera: 2.200 y 2.550 → promedio 2.375 × 95 × 0,86
        self.assertEqual(fila['demanda_proyectada'], Decimal('194037.50'))

    def test_limite_y_filtros(self):
        self.assertEqual(len(self.client.get(self.URL, {'limite': 3}).data['ranking']), 3)
        self.assertEqual(self.client.get(self.URL, {'canton': 'Pasaje'}).data['total_barrios'], 2)
        r = self.client.get(self.URL, {'canton': 'Quito'})
        self.assertEqual((r.status_code, r.data['demanda_total_proyectada'], r.data['ranking']), (200, 0, []))

    def test_filtro_invalido_400(self):
        for filtros in ({'limite': 0}, {'zona': 'x'}):
            self.assertEqual(self.client.get(self.URL, filtros).status_code, 400)

    def test_mayor_morosidad_baja_el_score(self):
        p = matriz.obtener_parametros()
        bajo = prediccion.calcular_score(Decimal(3000), 50, Decimal(1000), Decimal(1), p)
        alto = prediccion.calcular_score(Decimal(3000), 50, Decimal(1000), Decimal(9), p)
        sin_cartera = prediccion.calcular_score(Decimal(3000), 50, Decimal(0), Decimal(0), p)
        self.assertTrue(alto < sin_cartera < bajo)

    def test_validacion_no_inventa_correlacion(self):
        # La semilla crece igual en todos los barrios: no hay variación que validar.
        r = self.client.get(self.URL).data['validacion']
        self.assertEqual((r['observaciones'], r['correlacion_spearman']), (24, None))

    def test_validacion_detecta_relacion(self):
        p = matriz.obtener_parametros()
        for i in IndicadorBarrio.objects.filter(periodo_corte=date(2026, 10, 31)).select_related('barrio'):
            previo = IndicadorBarrio.objects.get(barrio=i.barrio, periodo_corte=date(2026, 9, 30))
            score = prediccion.calcular_score(
                i.barrio.densidad_poblacional_inec, previo.total_potenciales_socios,
                previo.monto_cartera_colocada, previo.indice_morosidad_porcentaje, p)
            i.monto_cartera_colocada = previo.monto_cartera_colocada * (1 + score / 100)
            i.save()
        self.assertGreater(self.client.get(self.URL).data['validacion']['correlacion_spearman'], 0.99)
