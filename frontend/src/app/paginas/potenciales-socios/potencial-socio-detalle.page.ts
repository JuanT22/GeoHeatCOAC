import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
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

import { ACTIVIDADES, ORIGENES, textoDe } from '../../core/catalogos';
import { DetalleBase } from '../base/detalle-base';

@Component({
  selector: 'app-potencial-socio-detalle',
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
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
          <ion-back-button defaultHref="/potenciales-socios" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Potencial socio</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (estado$ | async; as estado) {
        @if (estado.datos; as r) {
          <ion-list class="contenido" lines="full">
            <ion-list-header>
              <ion-label
                ><h1>{{ r.nombre_completo }}</h1></ion-label
              >
            </ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Identificación</p>
                <h3>{{ r.identificacion }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Barrio</p>
                <h3>{{ r.barrio_nombre }}, {{ r.canton }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Actividad económica</p>
                <h3>{{ textoDe(ACTIVIDADES, r.actividad_economica) }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Crédito estimado</p>
                <h3>{{ r.monto_credito_estimado | currency: 'USD' : 'symbol-narrow' }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Coordenadas</p>
                <h3>{{ r.latitud }}, {{ r.longitud }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Referencia</p>
                <h3>{{ r.direccion_referencia || '—' }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Origen</p>
                <h3>{{ textoDe(ORIGENES, r.origen_registro) }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Registrado</p>
                <h3>{{ r.fecha_registro | date: 'dd/MM/yyyy HH:mm' }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>
          <div class="acciones contenido">
            <ion-button [routerLink]="['/potenciales-socios', id, 'editar']">
              <ion-icon slot="start" name="create-outline"></ion-icon>
              Editar
            </ion-button>
            <ion-button
              color="danger"
              fill="outline"
              [disabled]="eliminando()"
              (click)="eliminar(r.nombre_completo)"
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
export class PotencialSocioDetallePage extends DetalleBase<'potenciales-socios'> {
  protected override readonly entidad = 'potenciales-socios';

  protected readonly ACTIVIDADES = ACTIVIDADES;
  protected readonly ORIGENES = ORIGENES;
  protected readonly textoDe = textoDe;
}
