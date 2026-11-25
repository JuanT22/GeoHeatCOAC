import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { combineLatest, debounceTime, map, startWith } from 'rxjs';

import {
  calcularMorosidad,
  colorCuadrante,
  evaluarMatriz,
  parametrosDesde,
  textoCuadrante,
} from '../../core/matriz-estrategica';
import { IndicadorBarrio } from '../../core/modelos';
import { FormBase } from '../base/form-base';

@Component({
  selector: 'app-indicador-form',
  imports: [
    AsyncPipe,
    DecimalPipe,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
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
          <ion-back-button defaultHref="/indicadores" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>{{ id === null ? 'Nuevo indicador' : 'Editar indicador' }}</ion-title>
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
                type="date"
                label="Período de corte"
                labelPlacement="stacked"
                formControlName="periodo_corte"
                [errorText]="error('periodo_corte')"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Cartera colocada (USD)"
                labelPlacement="stacked"
                formControlName="monto_cartera_colocada"
                [errorText]="error('monto_cartera_colocada')"
                inputmode="decimal"
                step="any"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Créditos activos"
                labelPlacement="stacked"
                formControlName="numero_creditos_activos"
                [errorText]="error('numero_creditos_activos')"
                inputmode="numeric"
                step="1"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Cartera vencida (USD)"
                labelPlacement="stacked"
                formControlName="monto_cartera_vencida"
                [errorText]="error('monto_cartera_vencida')"
                inputmode="decimal"
                step="any"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Índice de morosidad (%)"
                labelPlacement="stacked"
                formControlName="indice_morosidad_porcentaje"
                helperText="Déjelo vacío para calcularlo con los montos"
                [errorText]="error('indice_morosidad_porcentaje')"
                inputmode="decimal"
                step="any"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Socios activos"
                labelPlacement="stacked"
                formControlName="total_socios_activos"
                [errorText]="error('total_socios_activos')"
                inputmode="numeric"
                step="1"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Potenciales socios"
                labelPlacement="stacked"
                formControlName="total_potenciales_socios"
                [errorText]="error('total_potenciales_socios')"
                inputmode="numeric"
                step="1"
              ></ion-input>
            </ion-item>
          </ion-list>
          @if (vistaPrevia$ | async; as v) {
            <ion-item lines="none">
              <ion-label>
                <p>Vista previa de la Matriz 2x2</p>
                <p>
                  Oportunidad {{ v.oportunidad | number: '1.0-1' }} · Posicionamiento
                  {{ v.posicionamiento | number: '1.0-1' }}
                </p>
              </ion-label>
              <ion-badge slot="end" [color]="colorCuadrante(v.cuadrante)">{{
                textoCuadrante(v.cuadrante)
              }}</ion-badge>
            </ion-item>
          }
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
export class IndicadorFormPage extends FormBase<'indicadores'> {
  protected override readonly entidad = 'indicadores';

  protected readonly colorCuadrante = colorCuadrante;
  protected readonly textoCuadrante = textoCuadrante;
  protected readonly barrios$ = this.geo.opciones('barrios');

  override readonly form = this.fb.group({
    barrio: [null as number | null, Validators.required],
    periodo_corte: ['', Validators.required],
    monto_cartera_colocada: [null as number | null, [Validators.required, Validators.min(0)]],
    numero_creditos_activos: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
    monto_cartera_vencida: [null as number | null, [Validators.required, Validators.min(0)]],
    indice_morosidad_porcentaje: [null as number | null, [Validators.min(0), Validators.max(100)]],
    total_socios_activos: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
    total_potenciales_socios: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
  });

  /** Cuadrante que asignará la API con los datos escritos y los parámetros vigentes. */
  readonly vistaPrevia$ = combineLatest([
    this.form.valueChanges.pipe(startWith(null), debounceTime(150)),
    this.geo.opciones('barrios'),
    this.geo.opciones('parametros'),
  ]).pipe(
    map(([, barrios, parametros]) => {
      const v = this.form.getRawValue();
      const barrio = barrios.find((b) => b.id === v.barrio);
      if (!barrio || v.monto_cartera_colocada === null || v.total_potenciales_socios === null) {
        return null;
      }
      const cartera = v.monto_cartera_colocada;
      return evaluarMatriz(
        {
          densidad: barrio.densidad_poblacional_inec,
          potenciales: v.total_potenciales_socios,
          cartera,
          morosidad:
            v.indice_morosidad_porcentaje ??
            calcularMorosidad(cartera, v.monto_cartera_vencida ?? 0),
        },
        parametrosDesde(parametros),
      );
    }),
  );

  /** Al editar, el índice se deja vacío para que se recalcule si cambian los montos. */
  protected override aFormulario(registro: IndicadorBarrio): Record<string, unknown> {
    return { ...registro, indice_morosidad_porcentaje: null };
  }
}
