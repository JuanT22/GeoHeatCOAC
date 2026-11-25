import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SesionService } from './sesion.service';

export const sesionGuard: CanActivateFn = () =>
  inject(SesionService).sesion() ? true : inject(Router).createUrlTree(['/login']);
