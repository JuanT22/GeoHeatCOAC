import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';

import { ROLES } from '../core/catalogos';
import { mensajeError } from '../core/geoheat-api.service';
import { GeoheatService } from '../core/geoheat.service';
import { RolUsuario } from '../core/modelos';
import { SesionService } from '../core/sesion.service';
import { AvisosService } from './base/avisos.service';

@Component({
  selector: 'app-login',
  imports: [
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonText,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>GeoHeat COAC</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="login">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Iniciar sesión</ion-card-title>
            <ion-card-subtitle
              >Cooperativa de Ahorro y Crédito Padre Julián Lorente</ion-card-subtitle
            >
          </ion-card-header>
          <ion-card-content>
            <form [formGroup]="form" (ngSubmit)="entrar()">
              <ion-list lines="full">
                <ion-item>
                  <ion-input
                    label="Usuario o correo"
                    labelPlacement="stacked"
                    formControlName="username"
                    autocomplete="username"
                    errorText="Escriba su usuario o correo."
                  ></ion-input>
                </ion-item>
                <ion-item>
                  <ion-input
                    type="password"
                    label="Contraseña"
                    labelPlacement="stacked"
                    formControlName="password"
                    autocomplete="current-password"
                    errorText="Escriba su contraseña."
                  ></ion-input>
                </ion-item>
              </ion-list>
              @if (error()) {
                <p role="alert">
                  <ion-text color="danger">{{ error() }}</ion-text>
                </p>
              }
              <ion-button type="submit" expand="block" [disabled]="entrando()">
                {{ entrando() ? 'Verificando…' : 'Ingresar' }}
              </ion-button>
            </form>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Perfil de demostración</ion-card-title>
            <ion-card-subtitle>
              Entra sin contraseña: los cambios quedan en la bitácora como usuario anónimo
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            @for (rol of roles; track rol.valor) {
              <ion-chip
                color="primary"
                role="button"
                tabindex="0"
                (click)="entrarDemo(rol.valor, rol.texto)"
                (keyup.enter)="entrarDemo(rol.valor, rol.texto)"
              >
                <ion-icon name="person-circle-outline"></ion-icon>
                <ion-label>{{ rol.texto }}</ion-label>
              </ion-chip>
            }
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: `
    .login {
      max-width: 480px;
      margin: 0 auto;
    }
  `,
})
export class LoginPage {
  private readonly geo = inject(GeoheatService);
  private readonly sesion = inject(SesionService);
  private readonly avisos = inject(AvisosService);
  private readonly nav = inject(NavController);

  protected readonly roles = ROLES;
  readonly entrando = signal(false);
  readonly error = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.get('motivo') === 'vencida'
      ? 'Su sesión venció. Vuelva a ingresar.'
      : '',
  );

  readonly form = inject(NonNullableFormBuilder).group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password } = this.form.getRawValue();
    this.entrando.set(true);
    this.error.set('');
    this.geo.login({ username: username.trim(), password }).subscribe({
      next: () => {
        this.entrando.set(false);
        this.form.reset();
        void this.nav.navigateRoot('/inicio');
      },
      error: (error: unknown) => {
        this.entrando.set(false);
        this.form.controls.password.reset();
        // 401: credenciales inválidas. 403: cuenta bloqueada por 15 minutos.
        this.error.set(mensajeError(error));
        if (error instanceof HttpErrorResponse && error.status === 403) {
          void this.avisos.error(error);
        }
      },
    });
  }

  entrarDemo(rol: RolUsuario, nombre: string): void {
    this.sesion.iniciarDemo(rol, nombre);
    this.error.set('');
    void this.nav.navigateRoot('/inicio');
  }
}
