import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
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

import { COLOR_ESTADO_CARGA, DATASETS, ESTADOS_CARGA, textoDe } from '../../core/catalogos';
import { ListaBase } from '../base/lista-base';

@Component({
  selector: 'app-carga-csv-lista',
  imports: [
    AsyncPipe,
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
        <ion-title>Cargas CSV</ion-title>
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
              <ion-item [routerLink]="['/cargas-csv', r.id]" detail="true">
                <ion-icon slot="start" name="cloud-upload-outline" aria-hidden="true"></ion-icon>
                <ion-label>
                  <h2>{{ r.nombre_archivo }}</h2>
                  <p>
                    {{ textoDe(DATASETS, r.tipo_dataset) }} ·
                    {{ r.fecha_carga | date: 'dd/MM/yyyy HH:mm' }}
                  </p>
                  <p>
                    {{ r.filas_validas | number }} válidas · {{ r.filas_con_error | number }} con
                    error
                  </p>
                </ion-label>
                <ion-badge slot="end" [color]="COLOR_ESTADO_CARGA[r.estado_procesamiento]">{{
                  textoDe(ESTADOS_CARGA, r.estado_procesamiento)
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
        <ion-fab-button routerLink="/cargas-csv/nuevo" aria-label="Crear registro">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
})
export class CargaCsvListaPage extends ListaBase<'cargas-csv'> {
  protected override readonly entidad = 'cargas-csv';

  protected readonly COLOR_ESTADO_CARGA = COLOR_ESTADO_CARGA;
  protected readonly DATASETS = DATASETS;
  protected readonly ESTADOS_CARGA = ESTADOS_CARGA;
  protected readonly textoDe = textoDe;
}
