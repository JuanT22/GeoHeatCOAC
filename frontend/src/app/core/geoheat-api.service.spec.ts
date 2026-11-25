import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { urlApi } from './api.config';
import { GeoheatApiService, mensajeError } from './geoheat-api.service';
import { NombreEntidad } from './modelos';

const API = urlApi();
const ENTIDADES: NombreEntidad[] = [
  'zonas',
  'agencias',
  'barrios',
  'potenciales-socios',
  'indicadores',
  'hojas-ruta',
  'cargas-csv',
  'parametros',
  'bitacora',
  'usuarios',
];

describe('GeoheatApiService', () => {
  let api: GeoheatApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(GeoheatApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('usa la dirección local en el navegador', () => {
    expect(API).toBe('http://127.0.0.1:8000/api');
  });

  it.each(ENTIDADES)('CRUD completo de %s', (entidad) => {
    api.listar(entidad).subscribe();
    http.expectOne({ method: 'GET', url: `${API}/${entidad}/` }).flush([]);
    api.obtener(entidad, 7).subscribe();
    http.expectOne({ method: 'GET', url: `${API}/${entidad}/7/` }).flush({});
    api.crear(entidad, {}).subscribe();
    http.expectOne({ method: 'POST', url: `${API}/${entidad}/` }).flush({});
    api.actualizar(entidad, 7, {}).subscribe();
    http.expectOne({ method: 'PUT', url: `${API}/${entidad}/7/` }).flush({});
    api.modificar(entidad, 7, {}).subscribe();
    http.expectOne({ method: 'PATCH', url: `${API}/${entidad}/7/` }).flush({});
    api.eliminar(entidad, 7).subscribe();
    http.expectOne({ method: 'DELETE', url: `${API}/${entidad}/7/` }).flush(null);
  });

  it('acepta listas simples y paginadas', () => {
    const recibidas: unknown[] = [];
    api.listar('zonas').subscribe((r) => recibidas.push(r));
    http.expectOne(`${API}/zonas/`).flush([{ id: 1 }]);
    api.listar('zonas').subscribe((r) => recibidas.push(r));
    http
      .expectOne(`${API}/zonas/`)
      .flush({ count: 1, next: null, previous: null, results: [{ id: 2 }] });
    expect(recibidas).toEqual([[{ id: 1 }], [{ id: 2 }]]);
  });

  it('omite los filtros vacíos', () => {
    api.obtenerResumenKpis({ zona: 2, agencia: null, canton: '' }).subscribe();
    http.expectOne(`${API}/indicadores/resumen-kpis/?zona=2`).flush({});
  });

  it('el reporte de rutas solo envía los filtros que admite', () => {
    api.obtenerReporteCumplimiento({ agencia: 3, zona: 1 } as object).subscribe();
    http.expectOne(`${API}/rutas/reporte-cumplimiento/?agencia=3`).flush({});
  });

  it('envía el CSV como multipart', () => {
    api.procesarCsv(new File(['x'], 'cartera.csv'), '2026-10-31').subscribe();
    const peticion = http.expectOne({ method: 'POST', url: `${API}/cargas-csv/procesar/` });
    const cuerpo = peticion.request.body as FormData;
    expect((cuerpo.get('archivo') as File).name).toBe('cartera.csv');
    expect(cuerpo.get('periodo_corte')).toBe('2026-10-31');
    peticion.flush({});
  });

  it('login y proyección', () => {
    api.login({ username: 'a', password: 'b' }).subscribe();
    http.expectOne({ method: 'POST', url: `${API}/auth/login/` }).flush({});
    api.obtenerProyeccionExpansion().subscribe();
    http.expectOne(`${API}/indicadores/proyeccion-expansion/`).flush({});
  });
});

describe('mensajeError', () => {
  const http = (status: number, error: unknown) =>
    mensajeError(new HttpErrorResponse({ status, error }));

  it('reúne los mensajes de validación 400 por campo', () => {
    expect(
      http(400, { codigo_inec: ['Ya existe.', 'Muy corto.'], latitud: ['Fuera de rango.'] }),
    ).toBe('Codigo inec: Ya existe.\nCodigo inec: Muy corto.\nLatitud: Fuera de rango.');
  });

  it('no antepone el nombre en errores generales', () => {
    expect(http(400, { non_field_errors: ['Combinación repetida.'] })).toBe(
      'Combinación repetida.',
    );
    expect(http(400, { detail: 'No se puede eliminar.' })).toBe('No se puede eliminar.');
    expect(http(400, { detail: 'Faltan columnas.', columnas_obligatorias: ['a', 'b'] })).toBe(
      'Faltan columnas.',
    );
    expect(http(400, ['Error suelto.'])).toBe('Error suelto.');
  });

  it('muestra el motivo de un 401 o 403', () => {
    expect(http(401, { detail: 'Usuario o contraseña incorrectos.' })).toContain('incorrectos');
    expect(http(403, { detail: 'Cuenta bloqueada', bloqueado_hasta: '2026' })).toBe(
      'Cuenta bloqueada',
    );
  });

  it('traduce la falta de conexión, 404 y errores del servidor', () => {
    expect(http(0, null)).toContain('No se pudo conectar');
    expect(http(404, { detail: 'No ZonaComercial matches the given query.' })).toContain(
      'no existe',
    );
    expect(http(500, { traza: ['secreta'] })).toBe('El servidor respondió con un error (500).');
    expect(http(400, '<!doctype html><h1>Error</h1>')).toBe(
      'El servidor respondió con un error (400).',
    );
  });

  it('tolera errores que no son HTTP', () => {
    expect(mensajeError(new Error('fallo'))).toBe('fallo');
    expect(mensajeError(undefined)).toBe('Ocurrió un error inesperado.');
  });
});
