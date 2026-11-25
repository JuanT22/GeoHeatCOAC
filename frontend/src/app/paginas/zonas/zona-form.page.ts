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
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { FormBase } from '../base/form-base';

@Component({
  selector: 'app-zona-form',
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
    IonTextarea,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/zonas" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>{{ id === null ? 'Nueva zona' : 'Editar zona' }}</ion-title>
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
                label="Código"
                labelPlacement="stacked"
                formControlName="codigo_zona"
                [errorText]="error('codigo_zona')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Nombre"
                labelPlacement="stacked"
                formControlName="nombre_zona"
                [errorText]="error('nombre_zona')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-textarea
                label="Descripción"
                labelPlacement="stacked"
                formControlName="descripcion"
                [errorText]="error('descripcion')"
                [autoGrow]="true"
              ></ion-textarea>
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
export class ZonaFormPage extends FormBase<'zonas'> {
  protected override readonly entidad = 'zonas';

  override readonly form = this.fb.group({
    codigo_zona: ['', Validators.required],
    nombre_zona: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: [''],
  });
}
