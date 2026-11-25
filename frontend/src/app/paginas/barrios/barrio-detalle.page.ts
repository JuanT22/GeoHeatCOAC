import { AsyncPipe, DecimalPipe } from '@angular/common';
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

import { colorCuadrante, textoCuadrante } from '../../core/matriz-estrategica';
import { DetalleBase } from '../base/detalle-base';

@Component({
  selector: 'app-barrio-detalle',
  imports: [
    AsyncPipe,
    DecimalPipe,
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
          <ion-back-button defaultHref="/barrios" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Barrio</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (estado$ | async; as estado) {
        @if (estado.datos; as r) {
          <ion-list class="contenido" lines="full">
            <ion-list-header>
              <ion-label
                ><h1>{{ r.nombre_barrio }}</h1></ion-label
              >
              <ion-badge [color]="colorCuadrante(r.estrategia_2x2)">{{
                textoCuadrante(r.estrategia_2x2)
              }}</ion-badge>
            </ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Código INEC</p>
                <h3>{{ r.codigo_inec }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Agencia</p>
                <h3>{{ r.agencia_nombre }} · {{ r.zona_nombre }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Ubicación</p>
                <h3>{{ r.parroquia }}, {{ r.canton }}, {{ r.provincia }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Coordenadas del centroide</p>
                <h3>{{ r.latitud_centroide }}, {{ r.longitud_centroide }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Densidad poblacional INEC</p>
                <h3>{{ r.densidad_poblacional_inec | number: '1.0-2' }} hab/km²</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Familias estimadas</p>
                <h3>{{ r.numero_familias_estimado | number }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Potenciales socios registrados</p>
                <h3>{{ r.total_potenciales_registrados }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>
          <div class="acciones contenido">
            <ion-button [routerLink]="['/barrios', id, 'editar']">
              <ion-icon slot="start" name="create-outline"></ion-icon>
              Editar
            </ion-button>
            <ion-button
              color="danger"
              fill="outline"
              [disabled]="eliminando()"
              (click)="eliminar(r.nombre_barrio)"
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
export class BarrioDetallePage extends DetalleBase<'barrios'> {
  protected override readonly entidad = 'barrios';

  protected readonly colorCuadrante = colorCuadrante;
  protected readonly textoCuadrante = textoCuadrante;
}
