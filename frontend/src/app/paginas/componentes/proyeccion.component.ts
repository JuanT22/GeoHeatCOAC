import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { IonBadge, IonItem, IonLabel, IonList, IonNote, IonProgressBar } from '@ionic/angular';

import { COLOR_RECOMENDACION, RECOMENDACIONES, textoDe } from '../../core/catalogos';
import { ProyeccionExpansion } from '../../core/modelos';

/** Ranking de zonas de expansión (RF-012). */
@Component({
  selector: 'app-proyeccion',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    IonBadge,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonProgressBar,
  ],
  template: `
    @let p = datos();
    <ion-list lines="full">
      <ion-item>
        <ion-label class="ion-text-wrap">
          <h2>
            {{ p.demanda_total_proyectada | currency: 'USD' : 'symbol-narrow' : '1.0-0' }} de
            demanda proyectada
          </h2>
          <p>
            {{ p.brigadas_prioritarias }} brigadas prioritarias en {{ p.total_barrios }} microzonas
          </p>
          <p>
            Validación con {{ p.validacion.observaciones }} observaciones:
            @if (p.validacion.correlacion_spearman !== null) {
              Spearman {{ p.validacion.correlacion_spearman | number: '1.2-2' }}.
            }
            {{ p.validacion.nota }}
          </p>
        </ion-label>
      </ion-item>
      @for (b of p.ranking; track b.barrio) {
        <ion-item>
          <ion-note slot="start">{{ b.posicion }}</ion-note>
          <ion-label class="ion-text-wrap">
            <h2>{{ b.nombre_barrio }}, {{ b.canton }}</h2>
            <p>
              Score {{ b.score_crecimiento | number: '1.0-1' }} ·
              {{ b.demanda_proyectada | currency: 'USD' : 'symbol-narrow' : '1.0-0' }} ·
              {{ b.potenciales_socios | number }} potenciales · mora
              {{ b.indice_morosidad_porcentaje | number: '1.1-1' }} %
            </p>
            <ion-progress-bar
              [value]="b.score_crecimiento / 100"
              [attr.aria-label]="'Score de ' + b.nombre_barrio"
            ></ion-progress-bar>
            <p>{{ b.detalle_recomendacion }}</p>
          </ion-label>
          <ion-badge slot="end" [color]="COLOR_RECOMENDACION[b.recomendacion]">
            {{ textoDe(RECOMENDACIONES, b.recomendacion) }}
          </ion-badge>
        </ion-item>
      } @empty {
        <ion-item><ion-label>No hay microzonas con los filtros elegidos.</ion-label></ion-item>
      }
    </ion-list>
  `,
})
export class ProyeccionComponent {
  readonly datos = input.required<ProyeccionExpansion>();

  protected readonly COLOR_RECOMENDACION = COLOR_RECOMENDACION;
  protected readonly RECOMENDACIONES = RECOMENDACIONES;
  protected readonly textoDe = textoDe;
}
