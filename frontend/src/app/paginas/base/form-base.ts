import { Directive, inject, OnInit, signal } from '@angular/core';
import { FormGroup, NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';

import { GeoheatService } from '../../core/geoheat.service';
import { EntidadesApi, NombreEntidad } from '../../core/modelos';
import { AvisosService } from './avisos.service';

/** Comportamiento común de los formularios: sirve para crear (POST) y editar (PUT). */
@Directive()
export abstract class FormBase<K extends NombreEntidad> implements OnInit {
  protected readonly geo = inject(GeoheatService);
  protected readonly avisos = inject(AvisosService);
  protected readonly nav = inject(NavController);
  protected readonly fb = inject(NonNullableFormBuilder);
  protected abstract readonly entidad: K;
  abstract readonly form: FormGroup;

  private readonly parametroId = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly id = this.parametroId === null ? null : Number(this.parametroId);
  readonly cargando = signal(this.id !== null);
  readonly guardando = signal(false);

  ngOnInit(): void {
    if (this.id === null) {
      return;
    }
    this.geo.obtener(this.entidad, this.id).subscribe({
      next: (registro) => {
        this.form.patchValue(this.aFormulario(registro));
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        void this.avisos.error(error);
        void this.nav.navigateBack(['/', this.entidad]);
      },
    });
  }

  /** Permite adaptar el registro antes de mostrarlo. */
  protected aFormulario(registro: EntidadesApi[K]): Record<string, unknown> {
    return { ...registro };
  }

  /** Cuerpo de la petición: los valores nulos no se envían para que la API aplique los suyos. */
  protected aCuerpo(): Partial<EntidadesApi[K]> {
    const valores = Object.entries(this.form.getRawValue() as Record<string, unknown>)
      .map(([campo, valor]) => [campo, typeof valor === 'string' ? valor.trim() : valor] as const)
      .filter(([, valor]) => valor !== null && valor !== undefined);
    return Object.fromEntries(valores) as Partial<EntidadesApi[K]>;
  }

  guardar(): void {
    if (this.guardando()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void this.avisos.error('Revise los campos marcados en rojo.');
      return;
    }
    this.guardando.set(true);
    const id = this.id;
    const cuerpo = this.aCuerpo();
    const peticion =
      id === null
        ? this.geo.crear(this.entidad, cuerpo)
        : this.geo.actualizar(this.entidad, id, cuerpo);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        void this.avisos.exito(id === null ? 'Registro creado.' : 'Cambios guardados.');
        void this.nav.navigateBack(id === null ? ['/', this.entidad] : ['/', this.entidad, id]);
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        void this.avisos.error(error);
      },
    });
  }

  /** Texto de ayuda del campo inválido. */
  error(campo: string): string {
    const errores = this.form.get(campo)?.errors;
    if (!errores) {
      return '';
    }
    if (errores['required']) {
      return 'Este campo es obligatorio.';
    }
    if (errores['min']) {
      return `El valor mínimo es ${errores['min'].min}.`;
    }
    if (errores['max']) {
      return `El valor máximo es ${errores['max'].max}.`;
    }
    if (errores['minlength']) {
      return `Escriba al menos ${errores['minlength'].requiredLength} caracteres.`;
    }
    if (errores['email']) {
      return 'El correo no es válido.';
    }
    return 'El formato no es válido.';
  }
}
