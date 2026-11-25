import { Routes } from '@angular/router';

import { sesionGuard } from './core/sesion.guard';

// En cada entidad, /nuevo y /:id/editar van antes de /:id.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'login', loadComponent: () => import('./paginas/login.page').then((m) => m.LoginPage) },
  {
    path: '',
    canActivateChild: [sesionGuard],
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./paginas/dashboard-mapa.page').then((m) => m.DashboardMapaPage),
      },
      {
        path: 'zonas',
        loadComponent: () => import('./paginas/zonas/zona-lista.page').then((m) => m.ZonaListaPage),
      },
      {
        path: 'zonas/nuevo',
        loadComponent: () => import('./paginas/zonas/zona-form.page').then((m) => m.ZonaFormPage),
      },
      {
        path: 'zonas/:id/editar',
        loadComponent: () => import('./paginas/zonas/zona-form.page').then((m) => m.ZonaFormPage),
      },
      {
        path: 'zonas/:id',
        loadComponent: () =>
          import('./paginas/zonas/zona-detalle.page').then((m) => m.ZonaDetallePage),
      },
      {
        path: 'agencias',
        loadComponent: () =>
          import('./paginas/agencias/agencia-lista.page').then((m) => m.AgenciaListaPage),
      },
      {
        path: 'agencias/nuevo',
        loadComponent: () =>
          import('./paginas/agencias/agencia-form.page').then((m) => m.AgenciaFormPage),
      },
      {
        path: 'agencias/:id/editar',
        loadComponent: () =>
          import('./paginas/agencias/agencia-form.page').then((m) => m.AgenciaFormPage),
      },
      {
        path: 'agencias/:id',
        loadComponent: () =>
          import('./paginas/agencias/agencia-detalle.page').then((m) => m.AgenciaDetallePage),
      },
      {
        path: 'barrios',
        loadComponent: () =>
          import('./paginas/barrios/barrio-lista.page').then((m) => m.BarrioListaPage),
      },
      {
        path: 'barrios/nuevo',
        loadComponent: () =>
          import('./paginas/barrios/barrio-form.page').then((m) => m.BarrioFormPage),
      },
      {
        path: 'barrios/:id/editar',
        loadComponent: () =>
          import('./paginas/barrios/barrio-form.page').then((m) => m.BarrioFormPage),
      },
      {
        path: 'barrios/:id',
        loadComponent: () =>
          import('./paginas/barrios/barrio-detalle.page').then((m) => m.BarrioDetallePage),
      },
      {
        path: 'potenciales-socios',
        loadComponent: () =>
          import('./paginas/potenciales-socios/potencial-socio-lista.page').then(
            (m) => m.PotencialSocioListaPage,
          ),
      },
      {
        path: 'potenciales-socios/nuevo',
        loadComponent: () =>
          import('./paginas/potenciales-socios/potencial-socio-form.page').then(
            (m) => m.PotencialSocioFormPage,
          ),
      },
      {
        path: 'potenciales-socios/:id/editar',
        loadComponent: () =>
          import('./paginas/potenciales-socios/potencial-socio-form.page').then(
            (m) => m.PotencialSocioFormPage,
          ),
      },
      {
        path: 'potenciales-socios/:id',
        loadComponent: () =>
          import('./paginas/potenciales-socios/potencial-socio-detalle.page').then(
            (m) => m.PotencialSocioDetallePage,
          ),
      },
      {
        path: 'indicadores',
        loadComponent: () =>
          import('./paginas/indicadores/indicador-lista.page').then((m) => m.IndicadorListaPage),
      },
      {
        path: 'indicadores/nuevo',
        loadComponent: () =>
          import('./paginas/indicadores/indicador-form.page').then((m) => m.IndicadorFormPage),
      },
      {
        path: 'indicadores/:id/editar',
        loadComponent: () =>
          import('./paginas/indicadores/indicador-form.page').then((m) => m.IndicadorFormPage),
      },
      {
        path: 'indicadores/:id',
        loadComponent: () =>
          import('./paginas/indicadores/indicador-detalle.page').then(
            (m) => m.IndicadorDetallePage,
          ),
      },
      {
        path: 'hojas-ruta',
        loadComponent: () =>
          import('./paginas/hojas-ruta/hoja-ruta-lista.page').then((m) => m.HojaRutaListaPage),
      },
      {
        path: 'hojas-ruta/nuevo',
        loadComponent: () =>
          import('./paginas/hojas-ruta/hoja-ruta-form.page').then((m) => m.HojaRutaFormPage),
      },
      {
        path: 'hojas-ruta/:id/editar',
        loadComponent: () =>
          import('./paginas/hojas-ruta/hoja-ruta-form.page').then((m) => m.HojaRutaFormPage),
      },
      {
        path: 'hojas-ruta/:id',
        loadComponent: () =>
          import('./paginas/hojas-ruta/hoja-ruta-detalle.page').then((m) => m.HojaRutaDetallePage),
      },
      {
        path: 'cargas-csv',
        loadComponent: () =>
          import('./paginas/cargas-csv/carga-csv-lista.page').then((m) => m.CargaCsvListaPage),
      },
      {
        path: 'cargas-csv/nuevo',
        loadComponent: () =>
          import('./paginas/cargas-csv/carga-csv-form.page').then((m) => m.CargaCsvFormPage),
      },
      {
        path: 'cargas-csv/:id/editar',
        loadComponent: () =>
          import('./paginas/cargas-csv/carga-csv-form.page').then((m) => m.CargaCsvFormPage),
      },
      {
        path: 'cargas-csv/:id',
        loadComponent: () =>
          import('./paginas/cargas-csv/carga-csv-detalle.page').then((m) => m.CargaCsvDetallePage),
      },
      {
        path: 'parametros',
        loadComponent: () =>
          import('./paginas/parametros/parametro-lista.page').then((m) => m.ParametroListaPage),
      },
      {
        path: 'parametros/nuevo',
        loadComponent: () =>
          import('./paginas/parametros/parametro-form.page').then((m) => m.ParametroFormPage),
      },
      {
        path: 'parametros/:id/editar',
        loadComponent: () =>
          import('./paginas/parametros/parametro-form.page').then((m) => m.ParametroFormPage),
      },
      {
        path: 'parametros/:id',
        loadComponent: () =>
          import('./paginas/parametros/parametro-detalle.page').then((m) => m.ParametroDetallePage),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./paginas/usuarios/usuario-lista.page').then((m) => m.UsuarioListaPage),
      },
      {
        path: 'usuarios/nuevo',
        loadComponent: () =>
          import('./paginas/usuarios/usuario-form.page').then((m) => m.UsuarioFormPage),
      },
      {
        path: 'usuarios/:id/editar',
        loadComponent: () =>
          import('./paginas/usuarios/usuario-form.page').then((m) => m.UsuarioFormPage),
      },
      {
        path: 'usuarios/:id',
        loadComponent: () =>
          import('./paginas/usuarios/usuario-detalle.page').then((m) => m.UsuarioDetallePage),
      },
      {
        path: 'bitacora',
        loadComponent: () =>
          import('./paginas/bitacora/bitacora-lista.page').then((m) => m.BitacoraListaPage),
      },
      {
        path: 'bitacora/:id',
        loadComponent: () =>
          import('./paginas/bitacora/bitacora-detalle.page').then((m) => m.BitacoraDetallePage),
      },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
