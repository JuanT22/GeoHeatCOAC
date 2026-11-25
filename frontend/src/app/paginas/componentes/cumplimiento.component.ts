import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonProgressBar,
} from '@ionic/angular';

import { COLOR_ESTADO_RUTA, ESTADOS_RUTA, textoDe } from '../../core/catalogos';
import { ReporteCumplimiento } from '../../core/modelos';

/** Supervisión de hojas de ruta (RF-011). */
@Component({
  selector: 'app-cumplimiento',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    IonBadge,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonProgressBar,
    RouterLink,
  ],
  template: `
    @let r = datos();
    <ion-list lines="full">
      <ion-item>
        <ion-label class="ion-text-wrap">
          <h2>{{ r.porcentaje_cumplimiento | number: '1.0-1' }} % de cumplimiento global</h2>
          <p>
            {{ r.por_estado.CUMPLIDA }} de {{ r.total_rutas }} rutas asignadas ·
            {{ r.porcentaje_sobre_cerradas | number: '1.0-1' }} % de las ya cerradas
          </p>
          <p class="estados">
            @for (e of ESTADOS_RUTA; track e.valor) {
              <ion-badge [color]="COLOR_ESTADO_RUTA[e.valor]"
                >{{ e.texto }}: {{ r.por_estado[e.valor] }}</ion-badge
              >
            }
          </p>
        </ion-label>
      </ion-item>

      <ion-list-header><ion-label>Por oficial de crédito</ion-label></ion-list-header>
      @for (o of r.por_oficial; track o.oficial_credito) {
        <ion-item>
          <ion-label>
            <h3>{{ o.oficial_credito }}</h3>
            <p>
              {{ o.por_estado.CUMPLIDA }} de {{ o.total_rutas }} ·
              {{ o.porcentaje_cumplimiento | number: '1.0-1' }} %
            </p>
            <ion-progress-bar
              [value]="o.porcentaje_cumplimiento / 100"
              [attr.aria-label]="'Cumplimiento de ' + o.oficial_credito"
            ></ion-progress-bar>
          </ion-label>
        </ion-item>
      } @empty {
        <ion-item><ion-label>No hay rutas con los filtros elegidos.</ion-label></ion-item>
      }

      <ion-list-header><ion-label>Por agencia</ion-label></ion-list-header>
      @for (a of r.por_agencia; track a.agencia) {
        <ion-item>
          <ion-label>
            <h3>{{ a.agencia_nombre }}</h3>
            <p>
              {{ a.por_estado.CUMPLIDA }} de {{ a.total_rutas }} ·
              {{ a.porcentaje_cumplimiento | number: '1.0-1' }} %
            </p>
            <ion-progress-bar
              [value]="a.porcentaje_cumplimiento / 100"
              [attr.aria-label]="'Cumplimiento de ' + a.agencia_nombre"
            ></ion-progress-bar>
          </ion-label>
        </ion-item>
      }

      @if (r.visitas_no_realizadas.length) {
        <ion-list-header
          ><ion-label color="danger">Visitas no realizadas</ion-label></ion-list-header
        >
        @for (v of r.visitas_no_realizadas; track v.id) {
          <ion-item [routerLink]="['/hojas-ruta', v.id]" detail="true">
            <ion-label>
              <h3>{{ v.nombre_barrio }}</h3>
              <p>{{ v.oficial_credito }} · {{ v.fecha_programada | date: 'dd/MM/yyyy' }}</p>
            </ion-label>
            <ion-badge slot="end" [color]="COLOR_ESTADO_RUTA[v.estado]">{{
              textoDe(ESTADOS_RUTA, v.estado)
            }}</ion-badge>
          </ion-item>
        }
      }

      @if (r.variacion_por_barrio.length) {
        <ion-list-header><ion-label>Impacto en microzonas visitadas</ion-label></ion-list-header>
        @for (v of r.variacion_por_barrio; track v.barrio) {
          <ion-item>
            <ion-label>
              <h3>{{ v.nombre_barrio }}</h3>
              <p>
                {{ v.periodo_anterior | date: 'dd/MM/yyyy' }} a
                {{ v.periodo_actual | date: 'dd/MM/yyyy' }}
              </p>
              <p>
                Cartera {{ v.variacion_cartera > 0 ? '+' : ''
                }}{{ v.variacion_cartera | currency: 'USD' : 'symbol-narrow' }} · mora
                {{ v.variacion_morosidad > 0 ? '+' : ''
                }}{{ v.variacion_morosidad | number: '1.2-2' }} puntos
              </p>
            </ion-label>
          </ion-item>
        }
      }
    </ion-list>
  `,
  styles: `
    .estados {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding-top: 6px;
    }
  `,
})
export class CumplimientoComponent {
  readonly datos = input.required<ReporteCumplimiento>();

  protected readonly COLOR_ESTADO_RUTA = COLOR_ESTADO_RUTA;
  protected readonly ESTADOS_RUTA = ESTADOS_RUTA;
  protected readonly textoDe = textoDe;
}
