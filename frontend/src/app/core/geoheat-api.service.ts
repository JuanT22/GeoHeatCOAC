import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { urlApi } from './api.config';
import {
  Credenciales,
  EntidadesApi,
  FiltrosDashboard,
  NombreEntidad,
  Pagina,
  ProyeccionExpansion,
  ReporteCumplimiento,
  ResultadoCarga,
  ResumenKpis,
  Sesion,
} from './modelos';

export type ParametrosConsulta = Record<string, string | number | boolean | null | undefined>;

/** Única clase que usa HttpClient. */
@Injectable({ providedIn: 'root' })
export class GeoheatApiService {
  private readonly http = inject(HttpClient);
  private readonly base = urlApi();

  // --- CRUD de todas las entidades ---

  listar<K extends NombreEntidad>(
    entidad: K,
    consulta: ParametrosConsulta = {},
  ): Observable<EntidadesApi[K][]> {
    return this.http
      .get<EntidadesApi[K][] | Pagina<EntidadesApi[K]>>(this.url(entidad), {
        params: aParametros(consulta),
      })
      .pipe(map((respuesta) => (Array.isArray(respuesta) ? respuesta : respuesta.results)));
  }

  obtener<K extends NombreEntidad>(entidad: K, id: number): Observable<EntidadesApi[K]> {
    return this.http.get<EntidadesApi[K]>(this.url(entidad, id));
  }

  crear<K extends NombreEntidad>(
    entidad: K,
    cuerpo: Partial<EntidadesApi[K]>,
  ): Observable<EntidadesApi[K]> {
    return this.http.post<EntidadesApi[K]>(this.url(entidad), cuerpo);
  }

  /** Reemplazo completo (PUT). */
  actualizar<K extends NombreEntidad>(
    entidad: K,
    id: number,
    cuerpo: Partial<EntidadesApi[K]>,
  ): Observable<EntidadesApi[K]> {
    return this.http.put<EntidadesApi[K]>(this.url(entidad, id), cuerpo);
  }

  /** Cambio de algunos campos (PATCH). */
  modificar<K extends NombreEntidad>(
    entidad: K,
    id: number,
    cambios: Partial<EntidadesApi[K]>,
  ): Observable<EntidadesApi[K]> {
    return this.http.patch<EntidadesApi[K]>(this.url(entidad, id), cambios);
  }

  eliminar(entidad: NombreEntidad, id: number): Observable<void> {
    return this.http.delete<void>(this.url(entidad, id));
  }

  // --- Operaciones propias ---

  login(credenciales: Credenciales): Observable<Sesion> {
    return this.http.post<Sesion>(`${this.base}/auth/login/`, credenciales);
  }

  procesarCsv(archivo: File, periodoCorte?: string | null): Observable<ResultadoCarga> {
    const datos = new FormData();
    datos.append('archivo', archivo, archivo.name);
    if (periodoCorte) {
      datos.append('periodo_corte', periodoCorte);
    }
    return this.http.post<ResultadoCarga>(`${this.base}/cargas-csv/procesar/`, datos);
  }

  descargarErroresCsv(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/cargas-csv/${id}/errores/`, { responseType: 'blob' });
  }

  obtenerResumenKpis(filtros: FiltrosDashboard = {}): Observable<ResumenKpis> {
    return this.http.get<ResumenKpis>(`${this.base}/indicadores/resumen-kpis/`, {
      params: aParametros({ ...filtros }),
    });
  }

  obtenerProyeccionExpansion(filtros: FiltrosDashboard = {}): Observable<ProyeccionExpansion> {
    return this.http.get<ProyeccionExpansion>(`${this.base}/indicadores/proyeccion-expansion/`, {
      params: aParametros({ ...filtros }),
    });
  }

  obtenerReporteCumplimiento(
    filtros: Pick<FiltrosDashboard, 'agencia' | 'oficial_credito'> = {},
  ): Observable<ReporteCumplimiento> {
    return this.http.get<ReporteCumplimiento>(`${this.base}/rutas/reporte-cumplimiento/`, {
      params: aParametros({ agencia: filtros.agencia, oficial_credito: filtros.oficial_credito }),
    });
  }

  private url(entidad: NombreEntidad, id?: number): string {
    return `${this.base}/${entidad}/` + (id === undefined ? '' : `${id}/`);
  }
}

/** Omite los filtros vacíos. */
function aParametros(consulta: ParametrosConsulta): HttpParams {
  let parametros = new HttpParams();
  for (const [clave, valor] of Object.entries(consulta)) {
    if (valor !== null && valor !== undefined && valor !== '') {
      parametros = parametros.set(clave, valor);
    }
  }
  return parametros;
}

/** Mensaje legible de un error HTTP; en un 400 reúne las validaciones de Django REST Framework. */
export function mensajeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof Error && error.message ? error.message : 'Ocurrió un error inesperado.';
  }
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
  }
  if (error.status === 404) {
    return 'El registro no existe o ya fue eliminado.';
  }
  if (error.status < 500) {
    const mensajes = extraerMensajes(error.error);
    if (mensajes.length) {
      return mensajes.join('\n');
    }
  }
  return `El servidor respondió con un error (${error.status}).`;
}

const CAMPOS_SIN_PREFIJO = ['detail', 'non_field_errors'];

function extraerMensajes(cuerpo: unknown): string[] {
  if (typeof cuerpo === 'string') {
    // Una página HTML de error no es un mensaje para el usuario.
    return cuerpo.trim() && !cuerpo.trimStart().startsWith('<') ? [cuerpo.trim()] : [];
  }
  if (Array.isArray(cuerpo)) {
    return cuerpo.flatMap(extraerMensajes);
  }
  if (cuerpo && typeof cuerpo === 'object') {
    const campos = cuerpo as Record<string, unknown>;
    if (typeof campos['detail'] === 'string') {
      return [campos['detail']];
    }
    return Object.entries(campos).flatMap(([campo, valor]) =>
      extraerMensajes(valor).map((m) =>
        CAMPOS_SIN_PREFIJO.includes(campo) ? m : `${nombreCampo(campo)}: ${m}`,
      ),
    );
  }
  return [];
}

function nombreCampo(campo: string): string {
  const texto = campo.replaceAll('_', ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
