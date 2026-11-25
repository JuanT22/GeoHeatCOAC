import { AsyncPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
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

import { ACTIVIDADES, ORIGENES } from '../../core/catalogos';
import { ActividadEconomica, OrigenRegistro } from '../../core/modelos';
import { FormBase } from '../base/form-base';

@Component({
  selector: 'app-potencial-socio-form',
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
          <ion-back-button defaultHref="/potenciales-socios" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>{{
          id === null ? 'Nuevo potencial socio' : 'Editar potencial socio'
        }}</ion-title>
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
                label="Barrio"
                labelPlacement="stacked"
                formControlName="barrio"
                [errorText]="error('barrio')"
                interface="modal"
                cancelText="Cancelar"
                okText="Aceptar"
              >
                @for (o of barrios$ | async; track o.id) {
                  <ion-select-option [value]="o.id">{{
                    o.nombre_barrio + ' (' + o.canton + ')'
                  }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input
                type="tel"
                label="Cédula o RUC"
                labelPlacement="stacked"
                formControlName="identificacion"
                helperText="10 dígitos (cédula) o 13 (RUC)"
                [errorText]="error('identificacion')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Nombre completo"
                labelPlacement="stacked"
                formControlName="nombre_completo"
                [errorText]="error('nombre_completo')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-select
                label="Actividad económica"
                labelPlacement="stacked"
                formControlName="actividad_economica"
                [errorText]="error('actividad_economica')"
                cancelText="Cancelar"
                okText="Aceptar"
              >
                @for (o of ACTIVIDADES; track o.valor) {
                  <ion-select-option [value]="o.valor">{{ o.texto }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Crédito estimado (USD)"
                labelPlacement="stacked"
                formControlName="monto_credito_estimado"
                [errorText]="error('monto_credito_estimado')"
                inputmode="decimal"
                step="any"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Latitud"
                labelPlacement="stacked"
                formControlName="latitud"
                [errorText]="error('latitud')"
                inputmode="decimal"
                step="any"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Longitud"
                labelPlacement="stacked"
                formControlName="longitud"
                [errorText]="error('longitud')"
                inputmode="decimal"
                step="any"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Dirección de referencia"
                labelPlacement="stacked"
                formControlName="direccion_referencia"
                [errorText]="error('direccion_referencia')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-select
                label="Origen"
                labelPlacement="stacked"
                formControlName="origen_registro"
                [errorText]="error('origen_registro')"
                cancelText="Cancelar"
                okText="Aceptar"
              >
                @for (o of ORIGENES; track o.valor) {
                  <ion-select-option [value]="o.valor">{{ o.texto }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
          </ion-list>
          <div class="acciones">
            <ion-button
              type="button"
              fill="outline"
              [disabled]="ubicando()"
              (click)="usarUbicacion()"
            >
              <ion-icon slot="start" name="locate-outline"></ion-icon>
              {{ ubicando() ? 'Ubicando…' : 'Usar mi ubicación (GPS)' }}
            </ion-button>
          </div>
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
export class PotencialSocioFormPage extends FormBase<'potenciales-socios'> {
  protected override readonly entidad = 'potenciales-socios';

  protected readonly ACTIVIDADES = ACTIVIDADES;
  protected readonly ORIGENES = ORIGENES;
  protected readonly barrios$ = this.geo.opciones('barrios');

  override readonly form = this.fb.group({
    barrio: [null as number | null, Validators.required],
    identificacion: ['', [Validators.required, Validators.pattern(/^(\d{10}|\d{13})$/)]],
    nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
    actividad_economica: [null as ActividadEconomica | null, Validators.required],
    monto_credito_estimado: [null as number | null, [Validators.required, Validators.min(0.01)]],
    latitud: [
      null as number | null,
      [Validators.required, Validators.min(-5), Validators.max(1.5)],
    ],
    longitud: [
      null as number | null,
      [Validators.required, Validators.min(-92), Validators.max(-75)],
    ],
    direccion_referencia: [''],
    origen_registro: ['CAMPO' as OrigenRegistro, Validators.required],
  });

  readonly ubicando = signal(false);

  /** Captura las coordenadas del dispositivo (RF-002). */
  usarUbicacion(): void {
    if (!navigator.geolocation) {
      void this.avisos.error('Este dispositivo no permite obtener la ubicación.');
      return;
    }
    this.ubicando.set(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.ubicando.set(false);
        this.form.patchValue({
          latitud: Number(coords.latitude.toFixed(6)),
          longitud: Number(coords.longitude.toFixed(6)),
        });
      },
      () => {
        this.ubicando.set(false);
        void this.avisos.error('No se pudo obtener la ubicación. Escriba las coordenadas.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }
}
