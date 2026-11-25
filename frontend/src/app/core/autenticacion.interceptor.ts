import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { urlApi } from './api.config';
import { SesionService } from './sesion.service';

/** Envía el JWT para que la bitácora identifique al usuario y cierra la sesión si el token venció. */
export const autenticacionInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  const token = sesion.token;
  if (!token || !peticion.url.startsWith(urlApi()) || peticion.url.endsWith('/auth/login/')) {
    return siguiente(peticion);
  }
  return siguiente(peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && sesion.token === token) {
        sesion.cerrar();
        void router.navigate(['/login'], { queryParams: { motivo: 'vencida' } });
      }
      return throwError(() => error);
    }),
  );
};
