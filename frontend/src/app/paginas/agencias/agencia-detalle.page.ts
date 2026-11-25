import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { DetalleBase } from '../base/detalle-base';

@Component({
  selector: 'app-agencia-detalle',
  imports: [
    AsyncPipe,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
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
          <ion-back-button defaultHref="/agencias" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Agencia</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (estado$ | async; as estado) {
        @if (estado.datos; as r) {
          <ion-list class="contenido" lines="full">
            <ion-list-header>
              <ion-label
                ><h1>{{ r.nombre_agencia }}</h1></ion-label
              >
            </ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Zona comercial</p>
                <h3>{{ r.zona_nombre }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Dirección</p>
                <h3>{{ r.direccion }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Coordenadas</p>
                <h3>{{ r.latitud_central }}, {{ r.longitud_central }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>
          <div class="acciones contenido">
            <ion-button [routerLink]="['/agencias', id, 'editar']">
              <ion-icon slot="start" name="create-outline"></ion-icon>
              Editar
            </ion-button>
            <ion-button
              color="danger"
              fill="outline"
              [disabled]="eliminando()"
              (click)="eliminar(r.nombre_agencia)"
            >
              <ion-icon slot="start" name="trash-outline"></ion-icon>
              Eliminar
            </ion-button>
          </div>
        } @else if (estado.cargando) {
          <div class="centrado"><ion-spinner></ion-spinner></div>
        } @else {
          <div class="centrado">
            <ion-icon name="alert-circle-outline" color="danger" size="large"></ion-icon>
            <ion-text color="danger">{{ estado.error }}</ion-text>
          </div>
        }
      }
    </ion-content>
  `,
})
export class AgenciaDetallePage extends DetalleBase<'agencias'> {
  protected override readonly entidad = 'agencias';
}
