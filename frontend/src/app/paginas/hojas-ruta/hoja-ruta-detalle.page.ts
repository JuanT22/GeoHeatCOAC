import { AsyncPipe, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
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

import { COLOR_ESTADO_RUTA, ESTADOS_RUTA, GESTIONES, textoDe } from '../../core/catalogos';
import { DetalleBase } from '../base/detalle-base';

@Component({
  selector: 'app-hoja-ruta-detalle',
  imports: [
    AsyncPipe,
    DatePipe,
    IonBackButton,
    IonBadge,
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
          <ion-back-button defaultHref="/hojas-ruta" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Hoja de ruta</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (estado$ | async; as estado) {
        @if (estado.datos; as r) {
          <ion-list class="contenido" lines="full">
            <ion-list-header>
              <ion-label
                ><h1>{{ r.barrio_nombre }}</h1></ion-label
              >
              <ion-badge [color]="COLOR_ESTADO_RUTA[r.estado]">{{
                textoDe(ESTADOS_RUTA, r.estado)
              }}</ion-badge>
            </ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Agencia</p>
                <h3>{{ r.agencia_nombre }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Oficial de crédito</p>
                <h3>{{ r.oficial_credito }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Fecha programada</p>
                <h3>
                  {{ r.fecha_programada | date: 'dd/MM/yyyy' }} (semana {{ r.semana_numero }})
                </h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Tipo de gestión</p>
                <h3>{{ textoDe(GESTIONES, r.tipo_gestion) }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Observaciones</p>
                <h3>{{ r.observaciones || '—' }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>
          <div class="acciones contenido">
            <ion-button [routerLink]="['/hojas-ruta', id, 'editar']">
              <ion-icon slot="start" name="create-outline"></ion-icon>
              Editar
            </ion-button>
            <ion-button
              color="danger"
              fill="outline"
              [disabled]="eliminando()"
              (click)="eliminar(r.barrio_nombre)"
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
export class HojaRutaDetallePage extends DetalleBase<'hojas-ruta'> {
  protected override readonly entidad = 'hojas-ruta';

  protected readonly COLOR_ESTADO_RUTA = COLOR_ESTADO_RUTA;
  protected readonly ESTADOS_RUTA = ESTADOS_RUTA;
  protected readonly GESTIONES = GESTIONES;
  protected readonly textoDe = textoDe;
}
