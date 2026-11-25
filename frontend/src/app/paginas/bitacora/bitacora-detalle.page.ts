import { AsyncPipe, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import {
  IonBackButton,
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

import { EVENTOS, textoDe } from '../../core/catalogos';
import { DetalleBase } from '../base/detalle-base';

@Component({
  selector: 'app-bitacora-detalle',
  imports: [
    AsyncPipe,
    DatePipe,
    IonBackButton,
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
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/bitacora" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Registro de auditoría</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (estado$ | async; as estado) {
        @if (estado.datos; as r) {
          <ion-list class="contenido" lines="full">
            <ion-list-header>
              <ion-label
                ><h1>{{ textoDe(EVENTOS, r.tipo_evento) }}</h1></ion-label
              >
            </ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Entidad</p>
                <h3>{{ r.entidad_afectada }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Usuario</p>
                <h3>{{ r.usuario_responsable }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Fecha y hora</p>
                <h3>{{ r.fecha_hora | date: 'dd/MM/yyyy HH:mm:ss' }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Detalle</p>
                <h3>{{ r.detalle_cambio }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>
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
export class BitacoraDetallePage extends DetalleBase<'bitacora'> {
  protected override readonly entidad = 'bitacora';

  protected readonly EVENTOS = EVENTOS;
  protected readonly textoDe = textoDe;
}
