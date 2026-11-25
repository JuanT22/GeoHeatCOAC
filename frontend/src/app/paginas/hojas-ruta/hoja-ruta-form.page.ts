import { AsyncPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { combineLatest, map, startWith } from 'rxjs';

import { ESTADOS_RUTA, GESTIONES } from '../../core/catalogos';
import { semanaIso } from '../../core/matriz-estrategica';
import { EstadoRuta, TipoGestion } from '../../core/modelos';
import { FormBase } from '../base/form-base';

@Component({
  selector: 'app-hoja-ruta-form',
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
    IonTextarea,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/hojas-ruta" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>{{ id === null ? 'Nueva hoja de ruta' : 'Editar hoja de ruta' }}</ion-title>
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
                (ionChange)="alCambiarAgencia()"
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
              <ion-select
                label="Barrio"
                labelPlacement="stacked"
                formControlName="barrio"
                helperText="Solo los barrios de la agencia elegida"
                [errorText]="error('barrio')"
                interface="modal"
                cancelText="Cancelar"
                okText="Aceptar"
              >
                @for (o of barrios$ | async; track o.id) {
                  <ion-select-option [value]="o.id">{{ o.nombre_barrio }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input
                type="text"
                label="Oficial de crédito"
                labelPlacement="stacked"
                formControlName="oficial_credito"
                [errorText]="error('oficial_credito')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="date"
                label="Fecha programada"
                labelPlacement="stacked"
                formControlName="fecha_programada"
                [errorText]="error('fecha_programada')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Semana del año"
                labelPlacement="stacked"
                formControlName="semana_numero"
                helperText="Se calcula a partir de la fecha"
                [errorText]="error('semana_numero')"
                inputmode="numeric"
                step="1"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-select
                label="Tipo de gestión"
                labelPlacement="stacked"
                formControlName="tipo_gestion"
                [errorText]="error('tipo_gestion')"
                cancelText="Cancelar"
                okText="Aceptar"
              >
                @for (o of GESTIONES; track o.valor) {
                  <ion-select-option [value]="o.valor">{{ o.texto }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-select
                label="Estado"
                labelPlacement="stacked"
                formControlName="estado"
                [errorText]="error('estado')"
                cancelText="Cancelar"
                okText="Aceptar"
              >
                @for (o of ESTADOS_RUTA; track o.valor) {
                  <ion-select-option [value]="o.valor">{{ o.texto }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-textarea
                label="Observaciones"
                labelPlacement="stacked"
                formControlName="observaciones"
                [errorText]="error('observaciones')"
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
export class HojaRutaFormPage extends FormBase<'hojas-ruta'> implements OnInit {
  protected override readonly entidad = 'hojas-ruta';

  protected readonly ESTADOS_RUTA = ESTADOS_RUTA;
  protected readonly GESTIONES = GESTIONES;
  protected readonly agencias$ = this.geo.opciones('agencias');

  override readonly form = this.fb.group({
    agencia: [null as number | null, Validators.required],
    barrio: [null as number | null, Validators.required],
    oficial_credito: ['', [Validators.required, Validators.minLength(3)]],
    fecha_programada: ['', Validators.required],
    semana_numero: [
      null as number | null,
      [Validators.required, Validators.min(1), Validators.max(53)],
    ],
    tipo_gestion: [null as TipoGestion | null, Validators.required],
    estado: ['PENDIENTE' as EstadoRuta, Validators.required],
    observaciones: [''],
  });

  protected readonly barrios$ = combineLatest([
    this.geo.opciones('barrios'),
    this.form.controls.agencia.valueChanges.pipe(startWith(null)),
  ]).pipe(
    map(([barrios]) => barrios.filter((b) => b.agencia === this.form.controls.agencia.value)),
  );

  override ngOnInit(): void {
    super.ngOnInit();
    const { fecha_programada, semana_numero } = this.form.controls;
    fecha_programada.valueChanges.subscribe((fecha) => semana_numero.setValue(semanaIso(fecha)));
  }

  /** El barrio elegido se descarta si pertenece a otra agencia. */
  alCambiarAgencia(): void {
    this.form.controls.barrio.setValue(null);
  }
}
