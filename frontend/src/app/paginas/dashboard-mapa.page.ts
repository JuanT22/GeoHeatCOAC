import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  NavController,
  RefresherCustomEvent,
} from '@ionic/angular';
import { combineLatest, filter, map, take } from 'rxjs';

import { ACTIVIDADES, MODULOS } from '../core/catalogos';
import { GeoheatService } from '../core/geoheat.service';
import { CAPAS, CeldaMapa, colorCuadrante, CUADRANTES } from '../core/matriz-estrategica';
import { CapaTermica, FiltrosDashboard } from '../core/modelos';
import { SesionService } from '../core/sesion.service';
import { CumplimientoComponent } from './componentes/cumplimiento.component';
import { MapaCalorComponent } from './componentes/mapa-calor.component';
import { ProyeccionComponent } from './componentes/proyeccion.component';

type Seccion = 'mapa' | 'microzonas' | 'proyeccion' | 'rutas';
const SECCIONES: Seccion[] = ['mapa', 'microzonas', 'proyeccion', 'rutas'];

@Component({
  selector: 'app-dashboard-mapa',
  imports: [
    AsyncPipe,
    CumplimientoComponent,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCol,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRefresher,
    IonRefresherContent,
    IonRow,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
    MapaCalorComponent,
    ProyeccionComponent,
    RouterLink,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>GeoHeat COAC</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="salir()">
            <ion-icon slot="start" name="log-out-outline"></ion-icon>
            Salir
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <div class="contenido">
        @if (sesion.sesion(); as s) {
          <p class="sesion">
            <ion-icon name="person-circle-outline" aria-hidden="true"></ion-icon>
            {{ s.nombre_completo || s.username }} · {{ s.rol_nombre }}
            @if (sesion.esDemo()) {
              <ion-badge color="warning">Demo</ion-badge>
            }
          </p>
        }

        <ion-grid>
          <ion-row>
            @for (m of modulos; track m.ruta) {
              <ion-col size="6" sizeSm="4" sizeMd="2.4">
                <ion-button
                  class="modulo"
                  fill="outline"
                  expand="block"
                  [routerLink]="['/', m.ruta]"
                >
                  <ion-icon slot="start" [name]="m.icono"></ion-icon>
                  {{ m.titulo }}
                </ion-button>
              </ion-col>
            }
          </ion-row>
        </ion-grid>

        @if (filtros$ | async; as f) {
          <ion-grid>
            <ion-row>
              <ion-col size="12" sizeMd="4">
                <ion-select
                  label="Capa térmica"
                  labelPlacement="stacked"
                  interface="popover"
                  fill="outline"
                  [value]="capa$ | async"
                  (ionChange)="elegirCapa($event.detail.value)"
                >
                  @for (c of capas; track c.valor) {
                    <ion-select-option [value]="c.valor">{{ c.texto }}</ion-select-option>
                  }
                </ion-select>
              </ion-col>
              <ion-col size="6" sizeMd="4">
                <ion-select
                  label="Zona"
                  labelPlacement="stacked"
                  interface="popover"
                  fill="outline"
                  [value]="f.zona ?? null"
                  (ionChange)="filtrar({ zona: $event.detail.value, agencia: null })"
                >
                  <ion-select-option [value]="null">Todas</ion-select-option>
                  @for (z of zonas$ | async; track z.id) {
                    <ion-select-option [value]="z.id">{{ z.nombre_zona }}</ion-select-option>
                  }
                </ion-select>
              </ion-col>
              <ion-col size="6" sizeMd="4">
                <ion-select
                  label="Agencia"
                  labelPlacement="stacked"
                  interface="popover"
                  fill="outline"
                  [value]="f.agencia ?? null"
                  (ionChange)="filtrar({ agencia: $event.detail.value })"
                >
                  <ion-select-option [value]="null">Todas</ion-select-option>
                  @for (a of agencias$ | async; track a.id) {
                    <ion-select-option [value]="a.id">{{ a.nombre_agencia }}</ion-select-option>
                  }
                </ion-select>
              </ion-col>
              <ion-col size="6" sizeMd="3">
                <ion-select
                  label="Cantón"
                  labelPlacement="stacked"
                  interface="popover"
                  fill="outline"
                  [value]="f.canton ?? null"
                  (ionChange)="filtrar({ canton: $event.detail.value })"
                >
                  <ion-select-option [value]="null">Todos</ion-select-option>
                  @for (c of cantones$ | async; track c) {
                    <ion-select-option [value]="c">{{ c }}</ion-select-option>
                  }
                </ion-select>
              </ion-col>
              <ion-col size="6" sizeMd="3">
                <ion-select
                  label="Oficial de crédito"
                  labelPlacement="stacked"
                  interface="popover"
                  fill="outline"
                  [value]="f.oficial_credito ?? null"
                  (ionChange)="filtrar({ oficial_credito: $event.detail.value })"
                >
                  <ion-select-option [value]="null">Todos</ion-select-option>
                  @for (o of oficiales$ | async; track o) {
                    <ion-select-option [value]="o">{{ o }}</ion-select-option>
                  }
                </ion-select>
              </ion-col>
              <ion-col size="6" sizeMd="3">
                <ion-select
                  label="Actividad"
                  labelPlacement="stacked"
                  interface="popover"
                  fill="outline"
                  [value]="f.actividad_economica ?? null"
                  (ionChange)="filtrar({ actividad_economica: $event.detail.value })"
                >
                  <ion-select-option [value]="null">Todas</ion-select-option>
                  @for (a of actividades; track a.valor) {
                    <ion-select-option [value]="a.valor">{{ a.texto }}</ion-select-option>
                  }
                </ion-select>
              </ion-col>
              <ion-col size="6" sizeMd="3">
                <ion-select
                  label="Cuadrante 2x2"
                  labelPlacement="stacked"
                  interface="popover"
                  fill="outline"
                  [value]="f.cuadrante ?? null"
                  (ionChange)="filtrar({ cuadrante: $event.detail.value })"
                >
                  <ion-select-option [value]="null">Todos</ion-select-option>
                  @for (c of cuadrantes; track c.valor) {
                    <ion-select-option [value]="c.valor">{{ c.texto }}</ion-select-option>
                  }
                </ion-select>
              </ion-col>
            </ion-row>
          </ion-grid>
        }

        @if (kpis$ | async; as estado) {
          @if (estado.datos; as k) {
            <ion-grid>
              <ion-row>
                <ion-col size="6" sizeMd="3">
                  <ion-card class="kpi">
                    <ion-card-content>
                      <p>Cartera colocada</p>
                      <strong>{{
                        k.cartera_total_colocada | currency: 'USD' : 'symbol-narrow' : '1.0-0'
                      }}</strong>
                      @if (k.linea_base.cartera_total !== null) {
                        <p>
                          de
                          {{
                            k.linea_base.cartera_total | currency: 'USD' : 'symbol-narrow' : '1.0-0'
                          }}
                          institucional
                        </p>
                      }
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="6" sizeMd="3">
                  <ion-card class="kpi">
                    <ion-card-content>
                      <p>Créditos activos</p>
                      <strong>{{ k.numero_creditos | number }}</strong>
                      @if (k.linea_base.numero_creditos !== null) {
                        <p>
                          de {{ k.linea_base.numero_creditos | number: '1.0-0' }} institucionales
                        </p>
                      }
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="6" sizeMd="3">
                  <ion-card class="kpi">
                    <ion-card-content>
                      <p>Barrios</p>
                      <strong>{{ k.total_barrios | number }}</strong>
                      @if (k.linea_base.total_barrios !== null) {
                        <p>de {{ k.linea_base.total_barrios | number: '1.0-0' }} institucionales</p>
                      }
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="6" sizeMd="3">
                  <ion-card class="kpi">
                    <ion-card-content>
                      <p>Morosidad</p>
                      <strong>{{ k.indice_morosidad_porcentaje | number: '1.2-2' }} %</strong>
                      <p>
                        {{ k.cartera_total_vencida | currency: 'USD' : 'symbol-narrow' : '1.0-0' }}
                        vencidos
                      </p>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="6" sizeMd="3">
                  <ion-card class="kpi">
                    <ion-card-content>
                      <p>Cartera por barrio</p>
                      <strong>{{
                        k.cartera_promedio_por_barrio | currency: 'USD' : 'symbol-narrow' : '1.0-0'
                      }}</strong>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="6" sizeMd="3">
                  <ion-card class="kpi">
                    <ion-card-content>
                      <p>Créditos por barrio</p>
                      <strong>{{ k.promedio_creditos_por_barrio | number: '1.0-1' }}</strong>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="6" sizeMd="3">
                  <ion-card class="kpi">
                    <ion-card-content>
                      <p>Socios activos</p>
                      <strong>{{ k.total_socios_activos | number }}</strong>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="6" sizeMd="3">
                  <ion-card class="kpi">
                    <ion-card-content>
                      <p>Potenciales socios</p>
                      <strong>{{ k.total_potenciales_socios | number }}</strong>
                      <p>{{ k.potenciales_registrados | number }} registrados</p>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
              </ion-row>
            </ion-grid>
            <p class="cuadrantes">
              @for (c of cuadrantes; track c.valor) {
                <ion-badge [color]="colorCuadrante(c.valor)" [title]="c.descripcion">
                  {{ c.texto }}: {{ k.distribucion_matriz_2x2[c.valor] }}
                </ion-badge>
              }
            </p>

            <ion-segment
              [value]="seccion()"
              [scrollable]="true"
              (ionChange)="elegirSeccion($event.detail.value)"
            >
              <ion-segment-button value="mapa"><ion-label>Mapa</ion-label></ion-segment-button>
              <ion-segment-button value="microzonas"
                ><ion-label>Microzonas</ion-label></ion-segment-button
              >
              <ion-segment-button value="proyeccion"
                ><ion-label>Proyección</ion-label></ion-segment-button
              >
              <ion-segment-button value="rutas"><ion-label>Rutas</ion-label></ion-segment-button>
            </ion-segment>

            @if (seccion() === 'mapa' || seccion() === 'microzonas') {
              @if (celdas$ | async; as celdas) {
                @if (!celdas.length) {
                  <div class="centrado">
                    <ion-text color="medium">Ninguna microzona coincide con los filtros.</ion-text>
                    <ion-button fill="outline" (click)="geo.limpiarFiltros()"
                      >Quitar filtros</ion-button
                    >
                  </div>
                } @else if (seccion() === 'mapa') {
                  <div class="ion-padding">
                    <app-mapa-calor
                      [celdas]="celdas"
                      [agencias]="(todasLasAgencias$ | async) ?? []"
                      [unidad]="unidad((capa$ | async) ?? 'CARTERA')"
                      [seleccionado]="elegida()"
                      (elegir)="elegida.set($event.punto.barrio)"
                    ></app-mapa-calor>
                  </div>
                  @if (buscarElegida(celdas); as c) {
                    <ion-card>
                      <ion-card-header>
                        <ion-card-title>{{ c.punto.nombre_barrio }}</ion-card-title>
                        <ion-card-subtitle>
                          {{ c.punto.canton }} · {{ c.punto.agencia_nombre }} ·
                          {{ c.punto.zona_nombre }}
                        </ion-card-subtitle>
                      </ion-card-header>
                      <ion-card-content>
                        <ion-list lines="none">
                          <ion-item>
                            <ion-label>
                              <p>
                                Cartera
                                {{ c.punto.cartera_colocada | currency: 'USD' : 'symbol-narrow' }} ·
                                {{ c.punto.numero_creditos | number }} créditos
                              </p>
                              <p>
                                Mora {{ c.punto.indice_morosidad_porcentaje | number: '1.2-2' }} % ·
                                {{ c.punto.potenciales_socios | number }} potenciales
                              </p>
                              <p>
                                {{ c.punto.densidad_poblacional_inec | number: '1.0-0' }} hab/km² ·
                                corte {{ c.punto.periodo_corte | date: 'dd/MM/yyyy' }}
                              </p>
                            </ion-label>
                            <ion-badge slot="end" [color]="c.colorCuadrante">{{
                              c.textoCuadrante
                            }}</ion-badge>
                          </ion-item>
                        </ion-list>
                        <ion-button fill="clear" [routerLink]="['/barrios', c.punto.barrio]"
                          >Ver barrio</ion-button
                        >
                      </ion-card-content>
                    </ion-card>
                  }
                } @else {
                  <ion-grid>
                    <ion-row>
                      @for (c of celdas; track c.punto.barrio) {
                        <ion-col size="6" sizeMd="3">
                          <a
                            class="celda"
                            [style.--calor]="c.color"
                            [routerLink]="['/barrios', c.punto.barrio]"
                          >
                            <strong>{{ c.punto.nombre_barrio }}</strong>
                            <span>{{ c.punto.canton }}</span>
                            <span class="valor"
                              >{{ c.valor | number: '1.0-2' }}
                              {{ unidad((capa$ | async) ?? 'CARTERA') }}</span
                            >
                            <ion-badge [color]="c.colorCuadrante">{{ c.textoCuadrante }}</ion-badge>
                          </a>
                        </ion-col>
                      }
                    </ion-row>
                  </ion-grid>
                }
              }
            } @else if (seccion() === 'proyeccion') {
              @if (proyeccion$ | async; as e) {
                @if (e.datos; as datos) {
                  <app-proyeccion [datos]="datos"></app-proyeccion>
                } @else if (e.cargando) {
                  <div class="centrado"><ion-spinner></ion-spinner></div>
                } @else {
                  <div class="centrado">
                    <ion-text color="danger">{{ e.error }}</ion-text>
                  </div>
                }
              }
            } @else {
              @if (cumplimiento$ | async; as e) {
                @if (e.datos; as datos) {
                  <app-cumplimiento [datos]="datos"></app-cumplimiento>
                } @else if (e.cargando) {
                  <div class="centrado"><ion-spinner></ion-spinner></div>
                } @else {
                  <div class="centrado">
                    <ion-text color="danger">{{ e.error }}</ion-text>
                  </div>
                }
              }
            }
          } @else if (estado.cargando) {
            <div class="centrado"><ion-spinner></ion-spinner></div>
          } @else {
            <div class="centrado">
              <ion-icon name="alert-circle-outline" color="danger" size="large"></ion-icon>
              <ion-text color="danger">{{ estado.error }}</ion-text>
              <ion-button fill="outline" (click)="geo.recargar()">Reintentar</ion-button>
            </div>
          }
        }
      </div>
    </ion-content>
  `,
  styles: `
    .sesion {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 12px 16px 0;
    }
    .sesion ion-badge {
      flex-shrink: 0;
    }
    .modulo {
      margin: 0;
      text-transform: none;
      font-size: 0.8rem;
    }
    .kpi {
      height: 100%;
      margin: 0;
    }
    .kpi strong {
      font-size: 1.3rem;
      color: var(--ion-text-color, #000);
    }
    .cuadrantes {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 8px 16px;
    }
    .celda {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      height: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border-radius: 8px;
      border-left: 8px solid var(--calor);
      background: color-mix(in srgb, var(--calor) 16%, var(--ion-background-color, #fff));
      color: var(--ion-text-color, #000);
      text-decoration: none;
    }
    .valor {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class DashboardMapaPage {
  protected readonly geo = inject(GeoheatService);
  protected readonly sesion = inject(SesionService);
  private readonly nav = inject(NavController);

  protected readonly modulos = MODULOS;
  protected readonly capas = CAPAS;
  protected readonly cuadrantes = CUADRANTES;
  protected readonly actividades = ACTIVIDADES;
  protected readonly colorCuadrante = colorCuadrante;

  readonly seccion = signal<Seccion>('mapa');
  readonly elegida = signal<number | null>(null);

  readonly filtros$ = this.geo.filtros$;
  readonly capa$ = this.geo.capa$;
  readonly kpis$ = this.geo.kpis$;
  readonly celdas$ = this.geo.celdas$;
  readonly proyeccion$ = this.geo.proyeccion$;
  readonly cumplimiento$ = this.geo.cumplimiento$;

  readonly zonas$ = this.geo.opciones('zonas');
  readonly todasLasAgencias$ = this.geo.opciones('agencias');
  /** Solo las agencias de la zona elegida. */
  readonly agencias$ = combineLatest([this.todasLasAgencias$, this.filtros$]).pipe(
    map(([agencias, { zona }]) => agencias.filter((a) => !zona || a.zona === zona)),
  );
  readonly cantones$ = this.geo
    .opciones('barrios')
    .pipe(map((b) => unicos(b.map((x) => x.canton))));
  readonly oficiales$ = this.geo
    .opciones('hojas-ruta')
    .pipe(map((h) => unicos(h.map((x) => x.oficial_credito))));

  filtrar(cambios: FiltrosDashboard): void {
    this.elegida.set(null);
    this.geo.filtrar(cambios);
  }

  elegirCapa(capa: CapaTermica): void {
    this.geo.elegirCapa(capa);
  }

  elegirSeccion(valor: string | number | undefined): void {
    this.seccion.set(SECCIONES.find((s) => s === valor) ?? 'mapa');
  }

  unidad(capa: CapaTermica): string {
    return CAPAS.find((c) => c.valor === capa)?.unidad ?? '';
  }

  buscarElegida(celdas: CeldaMapa[]): CeldaMapa | undefined {
    return celdas.find((c) => c.punto.barrio === this.elegida());
  }

  refrescar(evento: RefresherCustomEvent): void {
    this.geo.recargar();
    this.kpis$
      .pipe(
        filter((estado) => !estado.cargando),
        take(1),
      )
      .subscribe(() => void evento.target.complete());
  }

  salir(): void {
    this.sesion.cerrar();
    void this.nav.navigateRoot('/login');
  }
}

function unicos(valores: string[]): string[] {
  return [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'es'));
}
