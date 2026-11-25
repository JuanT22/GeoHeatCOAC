import { AsyncPipe, DatePipe } from '@angular/common';
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

import { COLOR_ESTADO_RUTA, ESTADOS_RUTA, GESTIONES, textoDe } from '../../core/catalogos';
import { ListaBase } from '../base/lista-base';

@Component({
  selector: 'app-hoja-ruta-lista',
  imports: [
    AsyncPipe,
    DatePipe,
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
        <ion-title>Hojas de ruta</ion-title>
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
              <ion-item [routerLink]="['/hojas-ruta', r.id]" detail="true">
                <ion-icon slot="start" name="navigate-outline" aria-hidden="true"></ion-icon>
                <ion-label>
                  <h2>{{ r.barrio_nombre }}</h2>
                  <p>
                    Semana {{ r.semana_numero }} · {{ r.fecha_programada | date: 'dd/MM/yyyy' }} ·
                    {{ textoDe(GESTIONES, r.tipo_gestion) }}
                  </p>
                  <p>{{ r.oficial_credito }} · {{ r.agencia_nombre }}</p>
                </ion-label>
                <ion-badge slot="end" [color]="COLOR_ESTADO_RUTA[r.estado]">{{
                  textoDe(ESTADOS_RUTA, r.estado)
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
        <ion-fab-button routerLink="/hojas-ruta/nuevo" aria-label="Crear registro">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
})
export class HojaRutaListaPage extends ListaBase<'hojas-ruta'> {
  protected override readonly entidad = 'hojas-ruta';

  protected readonly COLOR_ESTADO_RUTA = COLOR_ESTADO_RUTA;
  protected readonly ESTADOS_RUTA = ESTADOS_RUTA;
  protected readonly GESTIONES = GESTIONES;
  protected readonly textoDe = textoDe;
}
