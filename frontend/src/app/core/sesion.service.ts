import { computed, Injectable, signal } from '@angular/core';

import { RolUsuario, Sesion } from './modelos';

const CLAVE_ALMACEN = 'geoheat.sesion';

/** Sesión activa (RF-001). Una sesión demo tiene rol pero no token: la API la registra como anónima. */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly estado = signal<Sesion | null>(leer());

  readonly sesion = this.estado.asReadonly();
  readonly rol = computed(() => this.estado()?.rol ?? null);
  readonly esDemo = computed(() => this.estado() !== null && this.estado()?.token === null);

  get token(): string | null {
    return this.estado()?.token ?? null;
  }

  iniciar(sesion: Sesion): void {
    this.estado.set(sesion);
    try {
      localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(sesion));
    } catch {
      // Sin almacenamiento disponible la sesión dura hasta cerrar la pestaña.
    }
  }

  iniciarDemo(rol: RolUsuario, rolNombre: string): void {
    this.iniciar({
      token: null,
      expira: null,
      username: 'demo',
      nombre_completo: 'Perfil de demostración',
      rol,
      rol_nombre: rolNombre,
      agencia_nombre: null,
    });
  }

  cerrar(): void {
    this.estado.set(null);
    try {
      localStorage.removeItem(CLAVE_ALMACEN);
    } catch {
      // Nada que limpiar.
    }
  }
}

function leer(): Sesion | null {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_ALMACEN) ?? 'null') as Sesion | null;
    const vencida = sesion?.expira && new Date(sesion.expira) <= new Date();
    return sesion?.rol && !vencida ? sesion : null;
  } catch {
    return null;
  }
}
