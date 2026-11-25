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
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { FormBase } from '../base/form-base';

@Component({
  selector: 'app-parametro-form',
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonSpinner,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/parametros" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>{{ id === null ? 'Nuevo parámetro' : 'Editar parámetro' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (cargando()) {
        <div class="centrado"><ion-spinner></ion-spinner></div>
      } @else {
        <form class="contenido" [formGroup]="form" (ngSubmit)="guardar()">
          <ion-list lines="none">
            <ion-item>
              <ion-input
                type="text"
                label="Clave"
                labelPlacement="stacked"
                formControlName="clave_parametro"
                helperText="Mayúsculas, números y guion bajo"
                [errorText]="error('clave_parametro')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Descripción"
                labelPlacement="stacked"
                formControlName="descripcion"
                [errorText]="error('descripcion')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Valor"
                labelPlacement="stacked"
                formControlName="valor_numerico"
                helperText="Al guardar se reclasifica la Matriz 2x2"
                [errorText]="error('valor_numerico')"
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
export class ParametroFormPage extends FormBase<'parametros'> {
  protected override readonly entidad = 'parametros';

  override readonly form = this.fb.group({
    clave_parametro: ['', [Validators.required, Validators.pattern(/^[A-Z][A-Z0-9_]*$/)]],
    descripcion: ['', Validators.required],
    valor_numerico: [null as number | null, [Validators.required, Validators.min(0)]],
  });
}
