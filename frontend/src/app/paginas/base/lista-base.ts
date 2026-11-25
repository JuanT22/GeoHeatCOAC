import { Directive, inject } from '@angular/core';
import { RefresherCustomEvent, SearchbarCustomEvent } from '@ionic/angular';
import { BehaviorSubject, defer, filter, take } from 'rxjs';

import { GeoheatService } from '../../core/geoheat.service';
import { NombreEntidad } from '../../core/modelos';

/** Comportamiento común de los listados: búsqueda reactiva y refresco. */
@Directive()
export abstract class ListaBase<K extends NombreEntidad> {
  protected readonly geo = inject(GeoheatService);
  protected abstract readonly entidad: K;

  private readonly texto$ = new BehaviorSubject('');
  readonly estado$ = defer(() => this.geo.buscar(this.entidad, this.texto$));

  buscar(evento: SearchbarCustomEvent): void {
    this.texto$.next(evento.detail.value ?? '');
  }

  refrescar(evento: RefresherCustomEvent): void {
    this.geo.recargar();
    this.geo
      .lista(this.entidad)
      .pipe(
        filter((estado) => !estado.cargando),
        take(1),
      )
      .subscribe(() => void evento.target.complete());
  }
}
