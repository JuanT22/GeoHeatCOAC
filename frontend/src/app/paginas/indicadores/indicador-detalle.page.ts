import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
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
  selector: 'app-indicador-detalle',
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
          <ion-back-button defaultHref="/indicadores" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Indicador de barrio</ion-title>
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
              <ion-badge [color]="colorCuadrante(r.cuadrante_matriz_2x2)">{{
                textoCuadrante(r.cuadrante_matriz_2x2)
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
                <p>Período de corte</p>
                <h3>{{ r.periodo_corte | date: 'dd/MM/yyyy' }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Cartera colocada</p>
                <h3>{{ r.monto_cartera_colocada | currency: 'USD' : 'symbol-narrow' }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Créditos activos</p>
                <h3>{{ r.numero_creditos_activos | number }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Cartera vencida</p>
                <h3>{{ r.monto_cartera_vencida | currency: 'USD' : 'symbol-narrow' }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Índice de morosidad</p>
                <h3>{{ r.indice_morosidad_porcentaje | number: '1.2-2' }} %</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Socios activos</p>
                <h3>{{ r.total_socios_activos | number }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Potenciales socios</p>
                <h3>{{ r.total_potenciales_socios | number }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Estrategia sugerida</p>
                <h3>{{ r.estrategia_sugerida }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>
          <div class="acciones contenido">
            <ion-button [routerLink]="['/indicadores', id, 'editar']">
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
export class IndicadorDetallePage extends DetalleBase<'indicadores'> {
  protected override readonly entidad = 'indicadores';

  protected readonly colorCuadrante = colorCuadrante;
  protected readonly textoCuadrante = textoCuadrante;
}
