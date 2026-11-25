import { AsyncPipe, CurrencyPipe } from '@angular/common';
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

import { ACTIVIDADES, textoDe } from '../../core/catalogos';
import { ListaBase } from '../base/lista-base';

@Component({
  selector: 'app-potencial-socio-lista',
  imports: [
    AsyncPipe,
    CurrencyPipe,
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
        <ion-title>Potenciales socios</ion-title>
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
              <ion-item [routerLink]="['/potenciales-socios', r.id]" detail="true">
                <ion-icon slot="start" name="people-outline" aria-hidden="true"></ion-icon>
                <ion-label>
                  <h2>{{ r.nombre_completo }}</h2>
                  <p>
                    {{ r.barrio_nombre }}, {{ r.canton }} ·
                    {{ r.monto_credito_estimado | currency: 'USD' : 'symbol-narrow' }}
                  </p>
                </ion-label>
                <ion-badge slot="end" color="primary">{{
                  textoDe(ACTIVIDADES, r.actividad_economica)
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
        <ion-fab-button routerLink="/potenciales-socios/nuevo" aria-label="Crear registro">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
})
export class PotencialSocioListaPage extends ListaBase<'potenciales-socios'> {
  protected override readonly entidad = 'potenciales-socios';

  protected readonly ACTIVIDADES = ACTIVIDADES;
  protected readonly textoDe = textoDe;
}
