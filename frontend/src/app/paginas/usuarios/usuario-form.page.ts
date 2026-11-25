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
  IonToggle,
  IonToolbar,
} from '@ionic/angular';

import { ROLES } from '../../core/catalogos';
import { PerfilUsuario, RolUsuario } from '../../core/modelos';
import { FormBase } from '../base/form-base';

@Component({
  selector: 'app-usuario-form',
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
    IonToggle,
    IonToolbar,
    ReactiveFormsModule,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/usuarios" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>{{ id === null ? 'Nuevo usuario' : 'Editar usuario' }}</ion-title>
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
                label="Usuario"
                labelPlacement="stacked"
                formControlName="username"
                [errorText]="error('username')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="email"
                label="Correo"
                labelPlacement="stacked"
                formControlName="email"
                [errorText]="error('email')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Nombres"
                labelPlacement="stacked"
                formControlName="first_name"
                [errorText]="error('first_name')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Apellidos"
                labelPlacement="stacked"
                formControlName="last_name"
                [errorText]="error('last_name')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-select
                label="Rol"
                labelPlacement="stacked"
                formControlName="rol"
                [errorText]="error('rol')"
                cancelText="Cancelar"
                okText="Aceptar"
              >
                @for (o of ROLES; track o.valor) {
                  <ion-select-option [value]="o.valor">{{ o.texto }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
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
                <ion-select-option [value]="null">Sin agencia</ion-select-option>
                @for (o of agencias$ | async; track o.id) {
                  <ion-select-option [value]="o.id">{{ o.nombre_agencia }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input
                type="password"
                label="Contraseña"
                labelPlacement="stacked"
                formControlName="password"
                helperText="Al editar, déjela vacía para conservarla"
                [errorText]="error('password')"
                autocomplete="new-password"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-toggle formControlName="is_active">Cuenta activa</ion-toggle>
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
export class UsuarioFormPage extends FormBase<'usuarios'> {
  protected override readonly entidad = 'usuarios';

  protected readonly ROLES = ROLES;
  protected readonly agencias$ = this.geo.opciones('agencias');

  override readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.pattern(/^[\w.@+-]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    rol: [null as RolUsuario | null, Validators.required],
    agencia: [null as number | null],
    password: [''],
    is_active: [true],
  });

  protected override aFormulario(registro: PerfilUsuario): Record<string, unknown> {
    return { ...registro, password: '' };
  }

  /** La agencia puede quedar vacía y la contraseña no se recorta ni se envía si no cambió. */
  protected override aCuerpo(): Partial<PerfilUsuario> {
    const { password, ...datos } = super.aCuerpo();
    const clave = this.form.controls.password.value;
    return {
      ...datos,
      agencia: this.form.controls.agencia.value,
      ...(clave ? { password: clave } : {}),
    };
  }
}
