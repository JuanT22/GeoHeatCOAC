import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { colorCuadrante, textoCuadrante } from '../../core/matriz-estrategica';
import { ListaBase } from '../base/lista-base';

@Component({
  selector: 'app-indicador-lista',
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/inicio" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Indicadores por barrio</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="Buscar" (ionInput)="buscar($event)"></ion-searchbar>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      @if (estado$ | async; as estado) {
        @if (estado.datos; as registros) {
          <ion-list class="contenido">
            @for (r of registros; track r.id) {
              <ion-item [routerLink]="['/indicadores', r.id]" detail="true">
                <ion-icon slot="start" name="stats-chart-outline" aria-hidden="true"></ion-icon>
                <ion-label>
                  <h2>{{ r.barrio_nombre }}</h2>
                  <p>{{ r.agencia_nombre }} · corte {{ r.periodo_corte | date: 'dd/MM/yyyy' }}</p>
                  <p>
                    {{ r.monto_cartera_colocada | currency: 'USD' : 'symbol-narrow' }} · mora
                    {{ r.indice_morosidad_porcentaje | number: '1.2-2' }} %
                  </p>
                </ion-label>
                <ion-badge slot="end" [color]="colorCuadrante(r.cuadrante_matriz_2x2)">{{
                  textoCuadrante(r.cuadrante_matriz_2x2)
                }}</ion-badge>
              </ion-item>
            } @empty {
              <div class="centrado">
                <ion-text color="medium">No hay registros que mostrar.</ion-text>
              </div>
            }
          </ion-list>
        } @else if (estado.cargando) {
          <div class="centrado"><ion-spinner></ion-spinner></div>
        } @else {
          <div class="centrado">
            <ion-icon name="alert-circle-outline" color="danger" size="large"></ion-icon>
            <ion-text color="danger">{{ estado.error }}</ion-text>
            <ion-button fill="outline" (click)="geo.recargar()">Reintentar</ion-button>
          </div>
        }
      }
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button routerLink="/indicadores/nuevo" aria-label="Crear registro">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
})
export class IndicadorListaPage extends ListaBase<'indicadores'> {
  protected override readonly entidad = 'indicadores';

  protected readonly colorCuadrante = colorCuadrante;
  protected readonly textoCuadrante = textoCuadrante;
}
