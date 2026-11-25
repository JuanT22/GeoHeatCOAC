import { AsyncPipe, DatePipe } from '@angular/common';
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
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { EVENTOS, textoDe } from '../../core/catalogos';
import { ListaBase } from '../base/lista-base';

@Component({
  selector: 'app-bitacora-lista',
  imports: [
    AsyncPipe,
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
        <ion-title>Bitácora de auditoría</ion-title>
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
              <ion-item [routerLink]="['/bitacora', r.id]" detail="true">
                <ion-icon slot="start" name="document-text-outline" aria-hidden="true"></ion-icon>
                <ion-label>
                  <h2>{{ textoDe(EVENTOS, r.tipo_evento) }} · {{ r.entidad_afectada }}</h2>
                  <p>
                    {{ r.usuario_responsable }} · {{ r.fecha_hora | date: 'dd/MM/yyyy HH:mm:ss' }}
                  </p>
                  <p>{{ r.detalle_cambio }}</p>
                </ion-label>
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
    </ion-content>
  `,
})
export class BitacoraListaPage extends ListaBase<'bitacora'> {
  protected override readonly entidad = 'bitacora';

  protected readonly EVENTOS = EVENTOS;
  protected readonly textoDe = textoDe;
}
