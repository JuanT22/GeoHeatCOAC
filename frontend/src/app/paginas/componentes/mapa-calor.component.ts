import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';

import { CeldaMapa, colorTermico } from '../../core/matriz-estrategica';
import { Agencia } from '../../core/modelos';

const ANCHO = 1000;
const ALTO = 640;
const MARGEN = 70;
const ZOOM_MAXIMO = 12;

interface Marca {
  celda: CeldaMapa;
  x: number;
  y: number;
  radio: number;
}

/** Mapa de calor en SVG: funciona sin proveedor de mapas base ni conexión externa (CU-004, 3a). */
@Component({
  selector: 'app-mapa-calor',
  imports: [DecimalPipe, IonButton, IonIcon],
  template: `
    <div class="marco">
      <div class="controles">
        <ion-button
          size="small"
          fill="solid"
          color="light"
          aria-label="Acercar"
          (click)="acercar(1.6)"
        >
          <ion-icon slot="icon-only" name="add-outline"></ion-icon>
        </ion-button>
        <ion-button
          size="small"
          fill="solid"
          color="light"
          aria-label="Alejar"
          (click)="acercar(1 / 1.6)"
        >
          <ion-icon slot="icon-only" name="remove-outline"></ion-icon>
        </ion-button>
        <ion-button
          size="small"
          fill="solid"
          color="light"
          aria-label="Ver todo"
          (click)="restablecer()"
        >
          <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
        </ion-button>
      </div>
      <svg
        [attr.viewBox]="vista()"
        [style.touch-action]="escala() > 1 ? 'none' : 'pan-y'"
        role="group"
        aria-label="Mapa de calor de microzonas"
        (pointerdown)="iniciarArrastre($event)"
        (pointermove)="arrastrar($event)"
        (pointerup)="terminarArrastre()"
        (pointercancel)="terminarArrastre()"
        (pointerleave)="terminarArrastre()"
      >
        <defs>
          @for (g of degradados; track g.id) {
            <radialGradient [attr.id]="g.id">
              <stop offset="0%" [attr.stop-color]="g.color" stop-opacity="0.75" />
              <stop offset="100%" [attr.stop-color]="g.color" stop-opacity="0" />
            </radialGradient>
          }
        </defs>
        <rect x="-5000" y="-5000" width="11000" height="11000" class="fondo" />
        @for (m of marcas(); track m.celda.punto.barrio) {
          <circle
            class="halo"
            [attr.cx]="m.x"
            [attr.cy]="m.y"
            [attr.r]="(m.radio * 3.5) / escala()"
            [attr.fill]="degradado(m.celda.intensidad)"
          />
        }
        @for (a of puntosAgencia(); track a.id) {
          <text class="agencia" [attr.x]="a.x" [attr.y]="a.y" [attr.font-size]="15 / escala()">
            {{ a.nombre }}
          </text>
        }
        @for (m of marcas(); track m.celda.punto.barrio) {
          <circle
            class="punto"
            tabindex="0"
            role="button"
            [attr.aria-label]="descripcion(m.celda)"
            [attr.cx]="m.x"
            [attr.cy]="m.y"
            [attr.r]="m.radio / escala()"
            [attr.fill]="m.celda.color"
            [attr.stroke]="'var(--ion-color-' + m.celda.colorCuadrante + ')'"
            [attr.stroke-width]="(seleccionado() === m.celda.punto.barrio ? 6 : 3) / escala()"
            (click)="elegir.emit(m.celda)"
            (keyup.enter)="elegir.emit(m.celda)"
          >
            <title>{{ descripcion(m.celda) }}</title>
          </circle>
        }
      </svg>
    </div>
    <div class="leyenda">
      <span>{{ minimo() | number: '1.0-1' }}</span>
      <span class="rampa" [style.background]="rampa"></span>
      <span>{{ maximo() | number: '1.0-1' }} {{ unidad() }}</span>
    </div>
    <p class="nota">
      Relleno: valor de la capa. Borde: cuadrante de la Matriz 2x2. Arrastre para desplazar.
    </p>
  `,
  styles: `
    .marco {
      position: relative;
    }
    .controles {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      flex-direction: column;
    }
    svg {
      display: block;
      width: 100%;
      aspect-ratio: 1000 / 640;
      max-height: 75vh;
      border-radius: 8px;
      cursor: grab;
    }
    .fondo {
      fill: var(--ion-color-light);
    }
    .halo,
    .agencia {
      pointer-events: none;
    }
    .agencia {
      fill: var(--ion-color-medium-shade);
      text-anchor: middle;
    }
    .punto {
      cursor: pointer;
    }
    .leyenda {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 8px;
      font-size: 0.85rem;
      font-variant-numeric: tabular-nums;
    }
    .rampa {
      flex: 1;
      height: 10px;
      border-radius: 4px;
    }
    .nota {
      margin: 4px 0 0;
      font-size: 0.8rem;
      color: var(--ion-color-medium-shade);
    }
  `,
})
export class MapaCalorComponent {
  readonly celdas = input.required<CeldaMapa[]>();
  readonly agencias = input<Agencia[]>([]);
  readonly unidad = input('');
  readonly seleccionado = input<number | null>(null);
  readonly elegir = output<CeldaMapa>();

  protected readonly degradados = Array.from({ length: 11 }, (_, i) => ({
    id: `calor-${i}`,
    color: colorTermico(i / 10),
  }));
  protected readonly rampa = `linear-gradient(90deg, ${colorTermico(0)}, ${colorTermico(0.5)}, ${colorTermico(1)})`;

  protected readonly escala = signal(1);
  private readonly centro = signal<{ x: number; y: number } | null>(null);
  private arrastre: {
    x: number;
    y: number;
    centro: { x: number; y: number };
    factor: number;
  } | null = null;

  protected readonly minimo = computed(() =>
    Math.min(...this.celdas().map((c) => c.valor), Infinity),
  );
  protected readonly maximo = computed(() =>
    Math.max(...this.celdas().map((c) => c.valor), -Infinity),
  );

  /** Proyección plana: un grado mide lo mismo en ambos ejes, suficiente para el sur del Ecuador. */
  private readonly proyeccion = computed(() => {
    const lon = this.celdas().map((c) => c.punto.longitud);
    const lat = this.celdas().map((c) => c.punto.latitud);
    const rango = (v: number[]) => [
      v.reduce((a, b) => Math.min(a, b), Infinity),
      v.reduce((a, b) => Math.max(a, b), -Infinity),
    ];
    const [oeste, este] = rango(lon);
    const [sur, norte] = rango(lat);
    const k = Math.min(
      (ANCHO - 2 * MARGEN) / Math.max(este - oeste, 0.02),
      (ALTO - 2 * MARGEN) / Math.max(norte - sur, 0.02),
    );
    return {
      x: (v: number) => ANCHO / 2 + (v - (oeste + este) / 2) * k,
      y: (v: number) => ALTO / 2 + ((sur + norte) / 2 - v) * k,
    };
  });

  protected readonly marcas = computed<Marca[]>(() => {
    const p = this.proyeccion();
    return this.celdas().map((celda) => ({
      celda,
      x: p.x(celda.punto.longitud),
      y: p.y(celda.punto.latitud),
      radio: 8 + celda.intensidad * 8,
    }));
  });

  protected readonly puntosAgencia = computed(() => {
    const p = this.proyeccion();
    const visibles = new Set(this.celdas().map((c) => c.punto.agencia_nombre));
    return this.agencias()
      .filter((a) => visibles.has(a.nombre_agencia))
      .map((a) => ({
        id: a.id,
        nombre: a.nombre_agencia,
        x: p.x(a.longitud_central),
        y: p.y(a.latitud_central) - 22 / this.escala(),
      }));
  });

  protected readonly vista = computed(() => {
    const w = ANCHO / this.escala();
    const h = ALTO / this.escala();
    const c = this.centro() ?? { x: ANCHO / 2, y: ALTO / 2 };
    return `${c.x - w / 2} ${c.y - h / 2} ${w} ${h}`;
  });

  protected degradado(intensidad: number): string {
    return `url(#calor-${Math.round(intensidad * 10)})`;
  }

  protected descripcion(c: CeldaMapa): string {
    const valor = c.valor.toLocaleString('es-EC', { maximumFractionDigits: 2 });
    return `${c.punto.nombre_barrio} (${c.punto.canton}): ${valor} ${this.unidad()} · ${c.textoCuadrante}`;
  }

  acercar(factor: number): void {
    this.escala.update((e) => Math.min(Math.max(e * factor, 1), ZOOM_MAXIMO));
  }

  restablecer(): void {
    this.escala.set(1);
    this.centro.set(null);
  }

  protected iniciarArrastre(evento: PointerEvent): void {
    const svg = evento.currentTarget as SVGSVGElement;
    const matriz = svg.getScreenCTM();
    this.arrastre = {
      x: evento.clientX,
      y: evento.clientY,
      centro: this.centro() ?? { x: ANCHO / 2, y: ALTO / 2 },
      factor: matriz ? 1 / matriz.a : 1,
    };
  }

  protected arrastrar(evento: PointerEvent): void {
    const a = this.arrastre;
    if (a) {
      this.centro.set({
        x: a.centro.x - (evento.clientX - a.x) * a.factor,
        y: a.centro.y - (evento.clientY - a.y) * a.factor,
      });
    }
  }

  protected terminarArrastre(): void {
    this.arrastre = null;
  }
}
