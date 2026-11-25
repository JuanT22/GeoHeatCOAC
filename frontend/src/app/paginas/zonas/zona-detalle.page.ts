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
  selector: 'app-zona-detalle',
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
          <ion-back-button defaultHref="/zonas" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Zona comercial</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (estado$ | async; as estado) {
        @if (estado.datos; as r) {
          <ion-list class="contenido" lines="full">
            <ion-list-header>
              <ion-label
                ><h1>{{ r.nombre_zona }}</h1></ion-label
              >
            </ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Código</p>
                <h3>{{ r.codigo_zona }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Descripción</p>
                <h3>{{ r.descripcion || '—' }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Agencias</p>
                <h3>{{ r.total_agencias }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>
          <div class="acciones contenido">
            <ion-button [routerLink]="['/zonas', id, 'editar']">
              <ion-icon slot="start" name="create-outline"></ion-icon>
              Editar
            </ion-button>
            <ion-button
              color="danger"
              fill="outline"
              [disabled]="eliminando()"
              (click)="eliminar(r.nombre_zona)"
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
export class ZonaDetallePage extends DetalleBase<'zonas'> {
  protected override readonly entidad = 'zonas';
}
