import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { FormBase } from '../base/form-base';

@Component({
  selector: 'app-agencia-form',
  imports: [
    AsyncPipe,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/agencias" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>{{ id === null ? 'Nueva agencia' : 'Editar agencia' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (cargando()) {
        <div class="centrado"><ion-spinner></ion-spinner></div>
      } @else {
        <form class="contenido" [formGroup]="form" (ngSubmit)="guardar()">
          <ion-list lines="none">
            <ion-item>
              <ion-select
                label="Zona comercial"
                labelPlacement="stacked"
                formControlName="zona"
                [errorText]="error('zona')"
                interface="alert"
                cancelText="Cancelar"
                okText="Aceptar"
              >
                @for (o of zonas$ | async; track o.id) {
                  <ion-select-option [value]="o.id">{{ o.nombre_zona }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Nombre"
                labelPlacement="stacked"
                formControlName="nombre_agencia"
                [errorText]="error('nombre_agencia')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Dirección"
                labelPlacement="stacked"
                formControlName="direccion"
                [errorText]="error('direccion')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Latitud"
                labelPlacement="stacked"
                formControlName="latitud_central"
                [errorText]="error('latitud_central')"
                inputmode="decimal"
                step="any"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Longitud"
                labelPlacement="stacked"
                formControlName="longitud_central"
                [errorText]="error('longitud_central')"
                inputmode="decimal"
                step="any"
              ></ion-input>
            </ion-item>
          </ion-list>
          <div class="acciones">
            <ion-button type="submit" [disabled]="guardando()">
              <ion-icon slot="start" name="save-outline"></ion-icon>
              {{ guardando() ? 'Guardando…' : 'Guardar' }}
            </ion-button>
          </div>
        </form>
      }
    </ion-content>
  `,
})
export class AgenciaFormPage extends FormBase<'agencias'> {
  protected override readonly entidad = 'agencias';

  protected readonly zonas$ = this.geo.opciones('zonas');

  override readonly form = this.fb.group({
    zona: [null as number | null, Validators.required],
    nombre_agencia: ['', [Validators.required, Validators.minLength(3)]],
    direccion: ['', Validators.required],
    latitud_central: [
      null as number | null,
      [Validators.required, Validators.min(-5), Validators.max(1.5)],
    ],
    longitud_central: [
      null as number | null,
      [Validators.required, Validators.min(-92), Validators.max(-75)],
    ],
  });
}
