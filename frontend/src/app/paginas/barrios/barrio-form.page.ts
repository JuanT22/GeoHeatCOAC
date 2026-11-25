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

import { PROVINCIAS } from '../../core/catalogos';
import { Provincia } from '../../core/modelos';
import { FormBase } from '../base/form-base';

@Component({
  selector: 'app-barrio-form',
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
          <ion-back-button defaultHref="/barrios" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>{{ id === null ? 'Nuevo barrio' : 'Editar barrio' }}</ion-title>
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
                label="Agencia"
                labelPlacement="stacked"
                formControlName="agencia"
                [errorText]="error('agencia')"
                interface="alert"
                cancelText="Cancelar"
                okText="Aceptar"
              >
                @for (o of agencias$ | async; track o.id) {
                  <ion-select-option [value]="o.id">{{ o.nombre_agencia }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input
                type="tel"
                label="Código INEC"
                labelPlacement="stacked"
                formControlName="codigo_inec"
                helperText="Entre 6 y 12 dígitos"
                [errorText]="error('codigo_inec')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Nombre"
                labelPlacement="stacked"
                formControlName="nombre_barrio"
                [errorText]="error('nombre_barrio')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Parroquia"
                labelPlacement="stacked"
                formControlName="parroquia"
                [errorText]="error('parroquia')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Cantón"
                labelPlacement="stacked"
                formControlName="canton"
                [errorText]="error('canton')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-select
                label="Provincia"
                labelPlacement="stacked"
                formControlName="provincia"
                [errorText]="error('provincia')"
                cancelText="Cancelar"
                okText="Aceptar"
              >
                @for (o of PROVINCIAS; track o.valor) {
                  <ion-select-option [value]="o.valor">{{ o.texto }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Latitud"
                labelPlacement="stacked"
                formControlName="latitud_centroide"
                [errorText]="error('latitud_centroide')"
                inputmode="decimal"
                step="any"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Longitud"
                labelPlacement="stacked"
                formControlName="longitud_centroide"
                [errorText]="error('longitud_centroide')"
                inputmode="decimal"
                step="any"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Densidad INEC (hab/km²)"
                labelPlacement="stacked"
                formControlName="densidad_poblacional_inec"
                [errorText]="error('densidad_poblacional_inec')"
                inputmode="decimal"
                step="any"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Familias estimadas"
                labelPlacement="stacked"
                formControlName="numero_familias_estimado"
                [errorText]="error('numero_familias_estimado')"
                inputmode="numeric"
                step="1"
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
export class BarrioFormPage extends FormBase<'barrios'> {
  protected override readonly entidad = 'barrios';

  protected readonly PROVINCIAS = PROVINCIAS;
  protected readonly agencias$ = this.geo.opciones('agencias');

  override readonly form = this.fb.group({
    agencia: [null as number | null, Validators.required],
    codigo_inec: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
    nombre_barrio: ['', [Validators.required, Validators.minLength(3)]],
    parroquia: ['', Validators.required],
    canton: ['', Validators.required],
    provincia: [null as Provincia | null, Validators.required],
    latitud_centroide: [
      null as number | null,
      [Validators.required, Validators.min(-5), Validators.max(1.5)],
    ],
    longitud_centroide: [
      null as number | null,
      [Validators.required, Validators.min(-92), Validators.max(-75)],
    ],
    densidad_poblacional_inec: [null as number | null, [Validators.required, Validators.min(0)]],
    numero_familias_estimado: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
  });
}
