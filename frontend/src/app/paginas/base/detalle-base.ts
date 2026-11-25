import { Directive, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { defer } from 'rxjs';

import { GeoheatService } from '../../core/geoheat.service';
import { NombreEntidad } from '../../core/modelos';
import { AvisosService } from './avisos.service';

/** Comportamiento común de las fichas: carga por id y eliminación con confirmación. */
@Directive()
export abstract class DetalleBase<K extends NombreEntidad> {
  protected readonly geo = inject(GeoheatService);
  protected readonly avisos = inject(AvisosService);
  private readonly nav = inject(NavController);
  protected abstract readonly entidad: K;

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly eliminando = signal(false);
  readonly estado$ = defer(() => this.geo.detalle(this.entidad, this.id));

  async eliminar(nombre: string): Promise<void> {
    const confirmado = await this.avisos.confirmar(
      'Eliminar registro',
      `¿Desea eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      'Eliminar',
    );
    if (!confirmado) {
      return;
    }
    this.eliminando.set(true);
    this.geo.eliminar(this.entidad, this.id).subscribe({
      next: () => {
        void this.avisos.exito('Registro eliminado.');
        void this.nav.navigateBack(['/', this.entidad]);
      },
      error: (error: unknown) => {
        this.eliminando.set(false);
        void this.avisos.error(error);
      },
    });
  }
}
