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

import { DetalleBase } from '../base/detalle-base';

@Component({
  selector: 'app-usuario-detalle',
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
          <ion-back-button defaultHref="/usuarios" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Usuario</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (estado$ | async; as estado) {
        @if (estado.datos; as r) {
          <ion-list class="contenido" lines="full">
            <ion-list-header>
              <ion-label
                ><h1>{{ r.username }}</h1></ion-label
              >
              <ion-badge
                [color]="!r.is_active ? 'medium' : r.esta_bloqueado ? 'danger' : 'success'"
                >{{
                  !r.is_active ? 'Inactivo' : r.esta_bloqueado ? 'Bloqueado' : 'Activo'
                }}</ion-badge
              >
            </ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Nombre</p>
                <h3>{{ r.first_name }} {{ r.last_name }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Correo</p>
                <h3>{{ r.email }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Rol</p>
                <h3>{{ r.rol_nombre }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Agencia</p>
                <h3>{{ r.agencia_nombre || '—' }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Intentos fallidos</p>
                <h3>{{ r.intentos_fallidos }}</h3>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">
                <p>Bloqueado hasta</p>
                <h3>{{ (r.bloqueado_hasta | date: 'dd/MM/yyyy HH:mm') || '—' }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>
          <div class="acciones contenido">
            <ion-button [routerLink]="['/usuarios', id, 'editar']">
              <ion-icon slot="start" name="create-outline"></ion-icon>
              Editar
            </ion-button>
            <ion-button
              color="danger"
              fill="outline"
              [disabled]="eliminando()"
              (click)="eliminar(r.username)"
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
export class UsuarioDetallePage extends DetalleBase<'usuarios'> {
  protected override readonly entidad = 'usuarios';
}
