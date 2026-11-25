import { DecimalPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { COLOR_ESTADO_CARGA, DATASETS, ESTADOS_CARGA, textoDe } from '../../core/catalogos';
import { EstadoProcesamiento, ResultadoCarga, TipoDataset } from '../../core/modelos';
import { FormBase } from '../base/form-base';

@Component({
  selector: 'app-carga-csv-form',
  imports: [
    DecimalPipe,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonSegment,
    IonSegmentButton,
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
          <ion-back-button defaultHref="/cargas-csv" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>{{
          id === null ? 'Nuevo registro de carga' : 'Editar registro de carga'
        }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (cargando()) {
        <div class="centrado"><ion-spinner></ion-spinner></div>
      } @else {
        @if (id === null) {
          <ion-segment
            [value]="modo()"
            (ionChange)="modo.set($event.detail.value === 'manual' ? 'manual' : 'archivo')"
          >
            <ion-segment-button value="archivo"
              ><ion-label>Procesar archivo</ion-label></ion-segment-button
            >
            <ion-segment-button value="manual"
              ><ion-label>Registro manual</ion-label></ion-segment-button
            >
          </ion-segment>
        }
        @if (modo() === 'archivo') {
          <ion-card class="contenido">
            <ion-card-header>
              <ion-card-title>Subir CSV de cartera y morosidad</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>
                Columnas obligatorias: codigo_inec, nombre_barrio, cartera_colocada,
                creditos_activos, cartera_vencida.
              </p>
              <ion-item lines="none">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Archivo CSV"
                  (change)="elegirArchivo($event)"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  type="date"
                  label="Período de corte"
                  labelPlacement="stacked"
                  helperText="Para las filas sin periodo_corte; si lo deja vacío se usa la fecha de hoy"
                  [value]="periodo()"
                  (ionInput)="periodo.set($event.detail.value ?? '')"
                ></ion-input>
              </ion-item>
              <div class="acciones">
                <ion-button [disabled]="!archivo() || guardando()" (click)="procesar()">
                  <ion-icon slot="start" name="cloud-upload-outline"></ion-icon>
                  {{ guardando() ? 'Procesando…' : 'Procesar CSV' }}
                </ion-button>
              </div>
              @if (resultado(); as r) {
                <ion-item lines="none" [button]="true" (click)="verDetalle(r.id)">
                  <ion-label class="ion-text-wrap">
                    <h2>{{ r.nombre_archivo }}</h2>
                    <p>
                      {{ r.filas_validas | number }} de {{ r.total_filas_leidas | number }} filas
                      válidas
                    </p>
                    <p>
                      {{ r.indicadores_creados | number }} indicadores creados,
                      {{ r.indicadores_actualizados | number }} actualizados,
                      {{ r.barrios_creados | number }} barrios nuevos
                    </p>
                    @if (r.detalle_errores) {
                      <p class="error-archivo">{{ r.detalle_errores }}</p>
                    }
                  </ion-label>
                  <ion-badge slot="end" [color]="COLOR_ESTADO_CARGA[r.estado_procesamiento]">
                    {{ textoDe(ESTADOS_CARGA, r.estado_procesamiento) }}
                  </ion-badge>
                </ion-item>
              }
            </ion-card-content>
          </ion-card>
        } @else {
          <form class="contenido" [formGroup]="form" (ngSubmit)="guardar()">
            <ion-list lines="none">
              <ion-item>
                <ion-input
                  type="text"
                  label="Nombre del archivo"
                  labelPlacement="stacked"
                  formControlName="nombre_archivo"
                  helperText="Con extensión .csv"
                  [errorText]="error('nombre_archivo')"
                ></ion-input>
              </ion-item>
              <ion-item>
                <ion-select
                  label="Tipo de datos"
                  labelPlacement="stacked"
                  formControlName="tipo_dataset"
                  [errorText]="error('tipo_dataset')"
                  cancelText="Cancelar"
                  okText="Aceptar"
                >
                  @for (o of DATASETS; track o.valor) {
                    <ion-select-option [value]="o.valor">{{ o.texto }}</ion-select-option>
                  }
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-input
                  type="number"
                  label="Filas leídas"
                  labelPlacement="stacked"
                  formControlName="total_filas_leidas"
                  [errorText]="error('total_filas_leidas')"
                  inputmode="numeric"
                  step="1"
                ></ion-input>
              </ion-item>
              <ion-item>
                <ion-input
                  type="number"
                  label="Filas válidas"
                  labelPlacement="stacked"
                  formControlName="filas_validas"
                  [errorText]="error('filas_validas')"
                  inputmode="numeric"
                  step="1"
                ></ion-input>
              </ion-item>
              <ion-item>
                <ion-input
                  type="number"
                  label="Filas con error"
                  labelPlacement="stacked"
                  formControlName="filas_con_error"
                  [errorText]="error('filas_con_error')"
                  inputmode="numeric"
                  step="1"
                ></ion-input>
              </ion-item>
              <ion-item>
                <ion-select
                  label="Estado"
                  labelPlacement="stacked"
                  formControlName="estado_procesamiento"
                  [errorText]="error('estado_procesamiento')"
                  cancelText="Cancelar"
                  okText="Aceptar"
                >
                  @for (o of ESTADOS_CARGA; track o.valor) {
                    <ion-select-option [value]="o.valor">{{ o.texto }}</ion-select-option>
                  }
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-textarea
                  label="Detalle de errores"
                  labelPlacement="stacked"
                  formControlName="detalle_errores"
                  [errorText]="error('detalle_errores')"
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
      }
    </ion-content>
  `,
})
export class CargaCsvFormPage extends FormBase<'cargas-csv'> {
  protected override readonly entidad = 'cargas-csv';

  protected readonly COLOR_ESTADO_CARGA = COLOR_ESTADO_CARGA;
  protected readonly DATASETS = DATASETS;
  protected readonly ESTADOS_CARGA = ESTADOS_CARGA;
  protected readonly textoDe = textoDe;

  override readonly form = this.fb.group({
    nombre_archivo: ['', [Validators.required, Validators.pattern(/\.csv$/i)]],
    tipo_dataset: [null as TipoDataset | null, Validators.required],
    total_filas_leidas: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
    filas_validas: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
    filas_con_error: [
      0 as number | null,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
    estado_procesamiento: [null as EstadoProcesamiento | null, Validators.required],
    detalle_errores: [''],
  });

  readonly modo = signal<'archivo' | 'manual'>(this.id === null ? 'archivo' : 'manual');
  readonly archivo = signal<File | null>(null);
  readonly periodo = signal('');
  readonly resultado = signal<ResultadoCarga | null>(null);

  elegirArchivo(evento: Event): void {
    this.archivo.set((evento.target as HTMLInputElement).files?.[0] ?? null);
    this.resultado.set(null);
  }

  /** Envía el archivo real al ETL del backend (RF-003, RF-004). */
  procesar(): void {
    const archivo = this.archivo();
    if (!archivo) {
      return;
    }
    this.guardando.set(true);
    this.geo.procesarCsv(archivo, this.periodo()).subscribe({
      next: (resultado) => {
        this.guardando.set(false);
        this.resultado.set(resultado);
        void (resultado.filas_con_error
          ? this.avisos.advertencia(`Filas aisladas con error: ${resultado.filas_con_error}.`)
          : this.avisos.exito(`Filas procesadas: ${resultado.filas_validas}.`));
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        void this.avisos.error(error);
      },
    });
  }

  verDetalle(id: number): void {
    void this.nav.navigateForward(['/cargas-csv', id]);
  }
}
