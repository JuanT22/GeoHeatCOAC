import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { GeoheatApiService } from './geoheat-api.service';
import { GeoheatService } from './geoheat.service';
import { Estado, FiltrosDashboard, Sesion, ZonaComercial } from './modelos';
import { SesionService } from './sesion.service';

const zona = (id: number, nombre_zona: string) => ({ id, nombre_zona }) as ZonaComercial;

class ApiFalsa {
  registros: ZonaComercial[] = [zona(1, 'Zona 1 - Norte'), zona(2, 'Zona 2 - Catamayo')];
  fallo: HttpErrorResponse | null = null;
  filtros: FiltrosDashboard[] = [];
  consultasDetalle = 0;

  listar = vi.fn((): Observable<ZonaComercial[]> =>
    this.fallo ? throwError(() => this.fallo) : of([...this.registros]),
  );
  obtener = vi.fn((_: string, id: number) => {
    this.consultasDetalle++;
    return of(this.registros.find((r) => r.id === id));
  });
  crear = vi.fn((_: string, cuerpo: ZonaComercial) => {
    this.registros.push({ ...cuerpo, id: 99 });
    return of(cuerpo);
  });
  eliminar = vi.fn((_: string, id: number) => {
    this.registros = this.registros.filter((r) => r.id !== id);
    return of(undefined);
  });
  obtenerResumenKpis = vi.fn((filtros: FiltrosDashboard) => {
    this.filtros.push(filtros);
    return of({ puntos_mapa_calor: [] });
  });
  login = vi.fn(() => of({ token: 't', rol: 'ADMIN' } as Sesion));
}

describe('GeoheatService', () => {
  let servicio: GeoheatService;
  let api: ApiFalsa;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    api = new ApiFalsa();
    TestBed.configureTestingModule({ providers: [{ provide: GeoheatApiService, useValue: api }] });
    servicio = TestBed.inject(GeoheatService);
  });

  afterEach(() => vi.useRealTimers());

  function observar<T>(fuente: Observable<Estado<T>>) {
    const estados: Estado<T>[] = [];
    fuente.subscribe((e) => estados.push(e));
    return { estados, ultimo: () => estados[estados.length - 1] };
  }

  it('comparte una sola petición entre varias vistas', () => {
    observar(servicio.lista('zonas'));
    observar(servicio.lista('zonas'));
    expect(api.listar).toHaveBeenCalledTimes(1);
  });

  it('refresca la lista tras crear y eliminar', () => {
    const lista = observar(servicio.lista('zonas'));
    servicio.crear('zonas', zona(0, 'Zona 3')).subscribe();
    expect(lista.ultimo().datos?.map((z) => z.id)).toEqual([1, 2, 99]);
    servicio.eliminar('zonas', 1).subscribe();
    expect(lista.ultimo().datos?.map((z) => z.id)).toEqual([2, 99]);
  });

  it('conserva los datos mientras recarga', () => {
    const lista = observar(servicio.lista('zonas'));
    servicio.recargar();
    expect(lista.estados.filter((e) => e.cargando).at(-1)?.datos?.length).toBe(2);
  });

  it('un error no rompe el flujo y se recupera al recargar', () => {
    api.fallo = new HttpErrorResponse({ status: 0 });
    const lista = observar(servicio.lista('zonas'));
    expect(lista.ultimo().error).toContain('No se pudo conectar');
    api.fallo = null;
    servicio.recargar();
    expect(lista.ultimo()).toEqual({ cargando: false, datos: api.registros, error: null });
  });

  it('busca sin distinguir tildes ni mayúsculas y con espera', () => {
    api.registros = [zona(1, 'San Sebastián'), zona(2, 'La Pradera')];
    const texto$ = new BehaviorSubject('');
    const resultado = observar(servicio.buscar('zonas', texto$));
    expect(resultado.ultimo().datos?.length).toBe(2);
    texto$.next('SEBASTIAN');
    expect(resultado.ultimo().datos?.length).toBe(2);
    vi.advanceTimersByTime(250);
    expect(resultado.ultimo().datos?.map((z) => z.id)).toEqual([1]);
  });

  it('no vuelve a pedir un registro eliminado', () => {
    observar(servicio.detalle('zonas', 1));
    servicio.eliminar('zonas', 1).subscribe();
    expect(api.consultasDetalle).toBe(1);
  });

  it('agrupa los cambios de filtro en una sola consulta', () => {
    observar(servicio.kpis$);
    vi.advanceTimersByTime(200);
    servicio.filtrar({ zona: 1 });
    servicio.filtrar({ agencia: 5 });
    vi.advanceTimersByTime(200);
    expect(api.filtros).toEqual([{}, { zona: 1, agencia: 5 }]);
  });

  it('el login guarda el rol activo', () => {
    servicio.login({ username: 'a', password: 'b' }).subscribe();
    const sesion = TestBed.inject(SesionService);
    expect(sesion.rol()).toBe('ADMIN');
    expect(sesion.esDemo()).toBe(false);
  });
});

describe('SesionService', () => {
  beforeEach(() => localStorage.clear());

  it('restaura la sesión guardada', () => {
    TestBed.inject(SesionService).iniciarDemo('SUPERVISOR_METODOLOGICO', 'Supervisor');
    TestBed.resetTestingModule();
    const sesion = TestBed.inject(SesionService);
    expect(sesion.rol()).toBe('SUPERVISOR_METODOLOGICO');
    expect(sesion.esDemo()).toBe(true);
    expect(sesion.token).toBeNull();
  });

  it('descarta una sesión vencida o dañada', () => {
    localStorage.setItem(
      'geoheat.sesion',
      JSON.stringify({ rol: 'ADMIN', token: 't', expira: '2020-01-01T00:00:00Z' }),
    );
    expect(TestBed.inject(SesionService).sesion()).toBeNull();
    TestBed.resetTestingModule();
    localStorage.setItem('geoheat.sesion', '{dañada');
    expect(TestBed.inject(SesionService).sesion()).toBeNull();
  });

  it('cerrar borra lo guardado', () => {
    const sesion = TestBed.inject(SesionService);
    sesion.iniciarDemo('ADMIN', 'Administrador');
    sesion.cerrar();
    expect(sesion.sesion()).toBeNull();
    expect(localStorage.getItem('geoheat.sesion')).toBeNull();
  });
});
