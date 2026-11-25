import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  map,
  Observable,
  of,
  scan,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

import { GeoheatApiService, mensajeError } from './geoheat-api.service';
import { CeldaMapa, construirCeldas } from './matriz-estrategica';
import {
  CapaTermica,
  Credenciales,
  EntidadesApi,
  Estado,
  FiltrosDashboard,
  NombreEntidad,
  ProyeccionExpansion,
  ReporteCumplimiento,
  ResultadoCarga,
  ResumenKpis,
  Sesion,
} from './modelos';
import { SesionService } from './sesion.service';

type ListaEntidad<K extends NombreEntidad> = Observable<Estado<EntidadesApi[K][]>>;

/** Estado reactivo de la aplicación: toda escritura exitosa emite en recarga$ y refresca las vistas. */
@Injectable({ providedIn: 'root' })
export class GeoheatService {
  private readonly api = inject(GeoheatApiService);
  private readonly sesion = inject(SesionService);

  private readonly recarga$ = new BehaviorSubject<void>(undefined);
  private readonly filtrosSubject = new BehaviorSubject<FiltrosDashboard>({});
  private readonly capaSubject = new BehaviorSubject<CapaTermica>('CARTERA');
  private readonly listas = new Map<NombreEntidad, unknown>();
  private readonly eliminados = new Set<string>();

  readonly filtros$ = this.filtrosSubject.asObservable();
  readonly capa$ = this.capaSubject.asObservable();

  // --- Dashboard ---

  private readonly consulta$ = combineLatest([
    this.recarga$,
    this.filtrosSubject.pipe(
      debounceTime(200),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    ),
  ]).pipe(map(([, filtros]) => filtros));

  readonly kpis$: Observable<Estado<ResumenKpis>> = this.consulta$.pipe(
    switchMap((filtros) => conEstado(this.api.obtenerResumenKpis(filtros))),
    conservarDatos(),
    shareReplay(1),
  );

  readonly proyeccion$: Observable<Estado<ProyeccionExpansion>> = this.consulta$.pipe(
    switchMap((filtros) => conEstado(this.api.obtenerProyeccionExpansion(filtros))),
    conservarDatos(),
    shareReplay(1),
  );

  readonly cumplimiento$: Observable<Estado<ReporteCumplimiento>> = this.consulta$.pipe(
    switchMap((filtros) => conEstado(this.api.obtenerReporteCumplimiento(filtros))),
    conservarDatos(),
    shareReplay(1),
  );

  /** Microzonas coloreadas según la capa térmica activa. */
  readonly celdas$: Observable<CeldaMapa[]> = combineLatest([this.kpis$, this.capaSubject]).pipe(
    map(([estado, capa]) => construirCeldas(estado.datos?.puntos_mapa_calor ?? [], capa)),
    shareReplay(1),
  );

  filtrar(cambios: FiltrosDashboard): void {
    this.filtrosSubject.next({ ...this.filtrosSubject.value, ...cambios });
  }

  limpiarFiltros(): void {
    this.filtrosSubject.next({});
  }

  elegirCapa(capa: CapaTermica): void {
    this.capaSubject.next(capa);
  }

  // --- Lecturas ---

  recargar(): void {
    this.recarga$.next();
  }

  /** Lista compartida de una entidad; se refresca con cada recarga. */
  lista<K extends NombreEntidad>(entidad: K): ListaEntidad<K> {
    let lista = this.listas.get(entidad) as ListaEntidad<K> | undefined;
    if (!lista) {
      lista = this.recarga$.pipe(
        switchMap(() => conEstado(this.api.listar(entidad))),
        conservarDatos(),
        shareReplay(1),
      );
      this.listas.set(entidad, lista);
    }
    return lista;
  }

  /** Registros de una lista para los selectores de los formularios. */
  opciones<K extends NombreEntidad>(entidad: K): Observable<EntidadesApi[K][]> {
    return this.lista(entidad).pipe(map((estado) => estado.datos ?? []));
  }

  /** Lista filtrada por un texto de búsqueda. */
  buscar<K extends NombreEntidad>(entidad: K, texto$: Observable<string>): ListaEntidad<K> {
    const busqueda$ = texto$.pipe(
      debounceTime(250),
      map(normalizar),
      startWith(''),
      distinctUntilChanged(),
    );
    return combineLatest([this.lista(entidad), busqueda$]).pipe(
      map(([estado, busqueda]) => ({
        ...estado,
        datos: estado.datos?.filter((registro) => contiene(registro, busqueda)) ?? null,
      })),
    );
  }

  detalle<K extends NombreEntidad>(entidad: K, id: number): Observable<Estado<EntidadesApi[K]>> {
    return this.recarga$.pipe(
      // Un registro recién eliminado no se vuelve a pedir mientras su página se cierra.
      switchMap(() =>
        this.eliminados.has(`${entidad}/${id}`) ? EMPTY : conEstado(this.api.obtener(entidad, id)),
      ),
      conservarDatos(),
    );
  }

  obtener<K extends NombreEntidad>(entidad: K, id: number): Observable<EntidadesApi[K]> {
    return this.api.obtener(entidad, id);
  }

  // --- Escrituras ---

  crear<K extends NombreEntidad>(
    entidad: K,
    cuerpo: Partial<EntidadesApi[K]>,
  ): Observable<EntidadesApi[K]> {
    return this.api.crear(entidad, cuerpo).pipe(tap(() => this.recargar()));
  }

  actualizar<K extends NombreEntidad>(
    entidad: K,
    id: number,
    cuerpo: Partial<EntidadesApi[K]>,
  ): Observable<EntidadesApi[K]> {
    return this.api.actualizar(entidad, id, cuerpo).pipe(tap(() => this.recargar()));
  }

  modificar<K extends NombreEntidad>(
    entidad: K,
    id: number,
    cambios: Partial<EntidadesApi[K]>,
  ): Observable<EntidadesApi[K]> {
    return this.api.modificar(entidad, id, cambios).pipe(tap(() => this.recargar()));
  }

  eliminar(entidad: NombreEntidad, id: number): Observable<void> {
    return this.api.eliminar(entidad, id).pipe(
      tap(() => {
        this.eliminados.add(`${entidad}/${id}`);
        this.recargar();
      }),
    );
  }

  procesarCsv(archivo: File, periodoCorte?: string | null): Observable<ResultadoCarga> {
    return this.api.procesarCsv(archivo, periodoCorte).pipe(tap(() => this.recargar()));
  }

  descargarErroresCsv(id: number): Observable<Blob> {
    return this.api.descargarErroresCsv(id);
  }

  login(credenciales: Credenciales): Observable<Sesion> {
    return this.api.login(credenciales).pipe(
      tap((sesion) => {
        this.sesion.iniciar(sesion);
        this.recargar();
      }),
    );
  }
}

function conEstado<T>(peticion: Observable<T>): Observable<Estado<T>> {
  return peticion.pipe(
    map((datos): Estado<T> => ({ cargando: false, datos, error: null })),
    catchError((error: unknown) =>
      of<Estado<T>>({ cargando: false, datos: null, error: mensajeError(error) }),
    ),
    startWith<Estado<T>>({ cargando: true, datos: null, error: null }),
  );
}

/** Mientras recarga se siguen mostrando los datos anteriores, sin parpadeos. */
function conservarDatos<T>() {
  return scan<Estado<T>, Estado<T>>(
    (anterior, actual) => (actual.cargando ? { ...actual, datos: anterior.datos } : actual),
    { cargando: true, datos: null, error: null },
  );
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function contiene(registro: object, busqueda: string): boolean {
  return (
    !busqueda ||
    Object.values(registro).some(
      (valor) =>
        (typeof valor === 'string' || typeof valor === 'number') &&
        normalizar(`${valor}`).includes(busqueda),
    )
  );
}
