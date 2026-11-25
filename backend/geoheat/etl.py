"""ETL de archivos CSV de cartera y morosidad (RF-003, RF-004, CU-003).

Capa de ingesta independiente de HTTP (REST-001): recibe texto y devuelve un Resultado. Trabaja en
bloque para cumplir la meta de 50.000 filas en 10 segundos.
"""
import csv
import io
import re
import unicodedata
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import connection, transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

from . import matriz
from .models import Agencia, Barrio, IndicadorBarrio, Provincia
from .validaciones import normalizar_nombre

COLUMNAS_OBLIGATORIAS = ('codigo_inec', 'nombre_barrio', 'cartera_colocada', 'creditos_activos', 'cartera_vencida')
# Con ellas, además, un código INEC desconocido se da de alta como barrio nuevo.
COLUMNAS_BARRIO_NUEVO = ('agencia', 'parroquia', 'canton', 'provincia', 'latitud', 'longitud',
                         'densidad_poblacional_inec', 'numero_familias_estimado')
MAX_FILAS = 50_000
MAX_ENTERO = 2_147_483_647
CAMPOS_INDICADOR = ['monto_cartera_colocada', 'numero_creditos_activos', 'monto_cartera_vencida',
                    'indice_morosidad_porcentaje', 'total_socios_activos', 'total_potenciales_socios',
                    'cuadrante_matriz_2x2', 'estrategia_sugerida']


class EstructuraInvalida(Exception):
    """El archivo completo se rechaza (400)."""

    def __init__(self, errores):
        super().__init__(errores)
        self.errores = errores


class FilaInvalida(Exception):
    """Solo se aísla la fila."""


@dataclass
class Resultado:
    leidas: int = 0
    validas: int = 0
    indicadores_creados: int = 0
    indicadores_actualizados: int = 0
    barrios_creados: int = 0
    errores: list = field(default_factory=list)  # (número de fila, motivo)

    @property
    def estado(self):
        if not self.errores:
            return 'PROCESADO'
        return 'CON_OBSERVACIONES' if self.validas else 'FALLIDO'

    @property
    def detalle(self):
        return '\n'.join(f'Fila {fila}: {motivo}' for fila, motivo in self.errores)


# --- Lectura y conversión de valores ----------------------------------------------

def clave(texto):
    """Forma comparable de un nombre: sin tildes, mayúsculas ni espacios repetidos."""
    sin_tildes = unicodedata.normalize('NFKD', texto)
    return ' '.join(''.join(c for c in sin_tildes if not unicodedata.combining(c)).casefold().split())


def leer(texto):
    """Devuelve [(número de fila, {columna: valor})] o lanza EstructuraInvalida."""
    texto = texto.lstrip('﻿')
    cabecera = texto.split('\n', 1)[0]
    lector = csv.DictReader(
        io.StringIO(texto, newline=''), delimiter=';' if cabecera.count(';') > cabecera.count(',') else ',')
    try:
        columnas = ['_'.join(clave(c).split()) for c in lector.fieldnames or []]
        faltantes = [c for c in COLUMNAS_OBLIGATORIAS if c not in columnas]
        if faltantes:
            raise EstructuraInvalida({
                'detail': f'Faltan columnas obligatorias: {", ".join(faltantes)}.',
                'columnas_faltantes': faltantes, 'columnas_obligatorias': list(COLUMNAS_OBLIGATORIAS)})
        repetidas = sorted({c for c in columnas if c and columnas.count(c) > 1})
        if repetidas:
            raise EstructuraInvalida({'detail': f'Columnas repetidas: {", ".join(repetidas)}.'})
        lector.fieldnames = columnas
        filas = []
        for fila in lector:
            if len(filas) == MAX_FILAS:
                raise EstructuraInvalida({'detail': f'El archivo supera el máximo de {MAX_FILAS} filas.'})
            filas.append((lector.line_num, fila))
    except csv.Error as exc:
        raise EstructuraInvalida({'detail': f'El CSV está mal formado: {exc}.'}) from exc
    if not filas:
        raise EstructuraInvalida({'detail': 'El archivo no contiene filas de datos.'})
    return filas


def a_monto(texto, columna):
    """Acepta 41200.50, 41200,50, 41,200.50 y un $ inicial; lo ambiguo se rechaza."""
    valor = texto.removeprefix('$').strip()
    if re.fullmatch(r'\d{1,3}(,\d{3})+(\.\d{1,2})?', valor):
        valor = valor.replace(',', '')
    elif re.fullmatch(r'\d+,\d{1,2}', valor):
        valor = valor.replace(',', '.')
    if not re.fullmatch(r'[0-9]+(\.[0-9]{1,2})?', valor):
        raise FilaInvalida(f'{columna} no es un monto válido (número no negativo con hasta 2 decimales)')
    return Decimal(valor)


def a_entero(texto, columna):
    if not re.fullmatch(r'[0-9]{1,10}', texto) or int(texto) > MAX_ENTERO:
        raise FilaInvalida(f'{columna} no es un entero no negativo válido')
    return int(texto)


def a_coordenada(texto, columna):
    try:
        valor = Decimal(texto)
        # El rango de Ecuador lo verifica el modelo; aquí solo se ajusta la precisión del GPS.
        return valor.quantize(Decimal('0.000001')) if abs(valor) < 1000 else valor
    except InvalidOperation:
        raise FilaInvalida(f'{columna} no es una coordenada válida') from None


def a_periodo(texto):
    try:
        periodo = parse_date(texto)
    except ValueError:
        periodo = None
    if periodo is None:
        raise FilaInvalida('periodo_corte debe tener formato AAAA-MM-DD')
    if periodo > timezone.localdate():
        raise FilaInvalida('periodo_corte no puede ser una fecha futura')
    return periodo


def validar_modelo(objeto, excluir):
    """Aplica los validadores del modelo sin consultar la base de datos."""
    try:
        objeto.clean_fields(exclude=excluir)
        objeto.clean()
    except ValidationError as exc:
        raise FilaInvalida('; '.join(
            f'{campo}: {" ".join(mensajes)}' for campo, mensajes in exc.message_dict.items())) from None


# --- Procesamiento ------------------------------------------------------------------

class Cargador:
    def __init__(self, periodo):
        self.periodo = periodo
        self.parametros = matriz.obtener_parametros()
        self.barrios = {b.codigo_inec: b for b in Barrio.objects.all()}
        self.agencias = {}
        for agencia in Agencia.objects.all():
            nombre = clave(agencia.nombre_agencia)
            self.agencias[nombre] = None if nombre in self.agencias else agencia  # None: nombre ambiguo
        self.historial = {}  # barrio_id -> {periodo: (socios, potenciales)}, en orden cronológico
        for barrio_id, corte, socios, potenciales in IndicadorBarrio.objects.order_by('periodo_corte').values_list(
                'barrio_id', 'periodo_corte', 'total_socios_activos', 'total_potenciales_socios'):
            self.historial.setdefault(barrio_id, {})[corte] = (socios, potenciales)
        self.vistos = {}       # (código, período) -> número de fila
        self.indicadores = []
        self.nuevos = {}       # código -> Barrio sin guardar
        self.reubicados = {}   # código -> Barrio con coordenadas actualizadas

    def interpretar(self, numero, cruda):
        if None in cruda:
            raise FilaInvalida('tiene más valores que columnas')
        fila = {c: (v or '').strip() for c, v in cruda.items()}
        vacios = [c for c in COLUMNAS_OBLIGATORIAS if not fila[c]]
        vacios += [c for c in ('latitud', 'longitud') if c in fila and not fila[c]]
        if vacios:
            raise FilaInvalida(f'campos vacíos: {", ".join(vacios)}')

        periodo = a_periodo(fila['periodo_corte']) if fila.get('periodo_corte') else self.periodo
        colocada = a_monto(fila['cartera_colocada'], 'cartera_colocada')
        vencida = a_monto(fila['cartera_vencida'], 'cartera_vencida')
        creditos = a_entero(fila['creditos_activos'], 'creditos_activos')
        coordenadas = {
            f'{c}_centroide': a_coordenada(fila[c], c) for c in ('latitud', 'longitud') if c in fila}

        codigo = fila['codigo_inec']
        if codigo not in self.barrios and f'0{codigo}' in self.barrios:
            codigo = f'0{codigo}'  # Excel elimina el cero inicial (provincia de El Oro)
        barrio = self.barrios.get(codigo)
        es_nuevo = barrio is None
        if es_nuevo:
            barrio = self.construir_barrio(codigo, fila, coordenadas)
        elif clave(barrio.nombre_barrio) != clave(fila['nombre_barrio']):
            raise FilaInvalida(
                f'nombre_barrio no corresponde al código {codigo} (registrado: {barrio.nombre_barrio})')
        elif coordenadas:
            propuesta = Barrio(**{c.attname: getattr(barrio, c.attname) for c in Barrio._meta.concrete_fields})
            for campo, valor in coordenadas.items():
                setattr(propuesta, campo, valor)
            validar_modelo(propuesta, ['agencia'])

        if (codigo, periodo) in self.vistos:
            raise FilaInvalida(f'duplica el barrio y período de la fila {self.vistos[codigo, periodo]}')

        socios, potenciales = self.previos(barrio, periodo)
        if fila.get('socios_activos'):
            socios = a_entero(fila['socios_activos'], 'socios_activos')
        if fila.get('potenciales_socios'):
            potenciales = a_entero(fila['potenciales_socios'], 'potenciales_socios')
        indicador = IndicadorBarrio(
            barrio=barrio, periodo_corte=periodo, monto_cartera_colocada=colocada,
            numero_creditos_activos=creditos, monto_cartera_vencida=vencida,
            total_socios_activos=socios, total_potenciales_socios=potenciales)
        validar_modelo(indicador, ['barrio', 'indice_morosidad_porcentaje', 'cuadrante_matriz_2x2',
                                   'estrategia_sugerida'])
        indicador.indice_morosidad_porcentaje = IndicadorBarrio.calcular_morosidad(colocada, vencida)
        indicador.cuadrante_matriz_2x2, indicador.estrategia_sugerida = matriz.evaluar(
            barrio.densidad_poblacional_inec, potenciales, colocada,
            indicador.indice_morosidad_porcentaje, self.parametros)

        # La fila es válida: recién aquí se modifica el estado compartido.
        self.vistos[codigo, periodo] = numero
        self.indicadores.append(indicador)
        if es_nuevo:
            self.barrios[codigo] = self.nuevos[codigo] = barrio
        elif any(getattr(barrio, c) != valor for c, valor in coordenadas.items()):
            for campo, valor in coordenadas.items():
                setattr(barrio, campo, valor)
            if codigo not in self.nuevos:
                self.reubicados[codigo] = barrio

    def construir_barrio(self, codigo, fila, coordenadas):
        faltan = [c for c in COLUMNAS_BARRIO_NUEVO if not fila.get(c)]
        if faltan:
            raise FilaInvalida(
                f'el código {codigo} no existe y faltan datos para crear el barrio: {", ".join(faltan)}')
        agencia = self.agencias.get(clave(fila['agencia']))
        if agencia is None:
            raise FilaInvalida('la agencia no existe o su nombre es ambiguo')
        provincia = next((p for p in Provincia.values if clave(p) == clave(fila['provincia'])), fila['provincia'])
        barrio = Barrio(
            agencia=agencia, codigo_inec=codigo, nombre_barrio=normalizar_nombre(fila['nombre_barrio']),
            parroquia=normalizar_nombre(fila['parroquia']), canton=normalizar_nombre(fila['canton']),
            provincia=provincia,
            densidad_poblacional_inec=a_monto(fila['densidad_poblacional_inec'], 'densidad_poblacional_inec'),
            numero_familias_estimado=a_entero(fila['numero_familias_estimado'], 'numero_familias_estimado'),
            **coordenadas)
        validar_modelo(barrio, ['agencia'])
        return barrio

    def previos(self, barrio, periodo):
        """Socios y potenciales del mismo corte o del último anterior; 0 si no hay historia."""
        valores = (0, 0)
        for corte, datos in self.historial.get(barrio.pk, {}).items():
            if corte <= periodo:
                valores = datos
        return valores

    def guardar(self, resultado):
        if self.nuevos:
            Barrio.objects.bulk_create(self.nuevos.values(), batch_size=1000)
            guardados = Barrio.objects.in_bulk(list(self.nuevos), field_name='codigo_inec')
            for indicador in self.indicadores:  # MySQL no devuelve los id en bulk_create
                if indicador.barrio.codigo_inec in guardados:
                    indicador.barrio = guardados[indicador.barrio.codigo_inec]
        if self.reubicados:
            Barrio.objects.bulk_update(
                self.reubicados.values(), ['latitud_centroide', 'longitud_centroide'], batch_size=500)

        actualizados = sum(i.periodo_corte in self.historial.get(i.barrio_id, {}) for i in self.indicadores)
        destino = ({'unique_fields': ['barrio', 'periodo_corte']}
                   if connection.features.supports_update_conflicts_with_target else {})
        IndicadorBarrio.objects.bulk_create(
            self.indicadores, batch_size=1000, update_conflicts=True, update_fields=CAMPOS_INDICADOR, **destino)
        matriz.sincronizar_barrios({i.barrio_id for i in self.indicadores})

        resultado.validas = len(self.indicadores)
        resultado.indicadores_actualizados = actualizados
        resultado.indicadores_creados = resultado.validas - actualizados
        resultado.barrios_creados = len(self.nuevos)


@transaction.atomic
def procesar(texto, periodo=None):
    filas = leer(texto)
    cargador = Cargador(periodo or timezone.localdate())
    resultado = Resultado(leidas=len(filas))
    for numero, fila in filas:
        try:
            cargador.interpretar(numero, fila)
        except FilaInvalida as exc:
            resultado.errores.append((numero, str(exc)))
    cargador.guardar(resultado)
    return resultado
