import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
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

import { COLOR_ESTADO_CARGA, DATASETS, ESTADOS_CARGA, textoDe } from '../../core/catalogos';
import { DetalleBase } from '../base/detalle-base';

@Component({
  selector: 'app-carga-csv-detalle',
  imports: [
    AsyncPipe,
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
          <ion-back-button defaultHref="/cargas-csv" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Carga CSV</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (estado$ | async; as estado) {
        @if (estado.datos; as r) {
          <ion-list class="contenido" lines="full">
            <ion-list-header>
              <ion-label
                ><h1>{{ r.nombre_archivo }}</h1></ion-label
              >
              <ion-badge [color]="COLOR_ESTADO_CARGA[r.estado_procesamiento]">{{
                textoDe(ESTADOS_CARGA, r.estado_procesamiento)
              }}</ion-badge>
            </ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Tipo de datos</p>
                <h3>{{ textoDe(DATASETS, r.tipo_dataset) }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Fecha de carga</p>
                <h3>{{ r.fecha_carga | date: 'dd/MM/yyyy HH:mm' }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Filas leídas</p>
                <h3>{{ r.total_filas_leidas | number }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Filas válidas</p>
                <h3>{{ r.filas_validas | number }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Filas con error</p>
                <h3>{{ r.filas_con_error | number }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>
          @if (r.detalle_errores) {
            <div class="contenido">
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <p>Filas rechazadas</p>
                  <h3 class="error-archivo">{{ r.detalle_errores }}</h3>
                </ion-label>
              </ion-item>
              <div class="acciones">
                <ion-button fill="outline" (click)="descargarErrores()">
                  <ion-icon slot="start" name="download-outline"></ion-icon>
                  Descargar observaciones
                </ion-button>
              </div>
            </div>
          }
          <div class="acciones contenido">
            <ion-button [routerLink]="['/cargas-csv', id, 'editar']">
              <ion-icon slot="start" name="create-outline"></ion-icon>
              Editar
            </ion-button>
            <ion-button
              color="danger"
              fill="outline"
              [disabled]="eliminando()"
              (click)="eliminar(r.nombre_archivo)"
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
export class CargaCsvDetallePage extends DetalleBase<'cargas-csv'> {
  protected override readonly entidad = 'cargas-csv';

  protected readonly COLOR_ESTADO_CARGA = COLOR_ESTADO_CARGA;
  protected readonly DATASETS = DATASETS;
  protected readonly ESTADOS_CARGA = ESTADOS_CARGA;
  protected readonly textoDe = textoDe;

  /** Log de filas rechazadas (RF-004). */
  descargarErrores(): void {
    this.geo.descargarErroresCsv(this.id).subscribe({
      next: (archivo) => {
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(archivo);
        enlace.download = `observaciones_carga_${this.id}.csv`;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(enlace.href));
      },
      error: (error: unknown) => void this.avisos.error(error),
    });
  }
}
