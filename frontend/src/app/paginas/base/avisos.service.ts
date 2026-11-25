import { inject, Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

import { mensajeError } from '../../core/geoheat-api.service';

/** Avisos de resultado y confirmaciones. */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly toasts = inject(ToastController);
  private readonly alertas = inject(AlertController);

  exito(mensaje: string): Promise<void> {
    return this.mostrar(mensaje, 'success', 2500);
  }

  advertencia(mensaje: string): Promise<void> {
    return this.mostrar(mensaje, 'warning', 5000);
  }

  /** Toast rojo con los mensajes de validación del backend. */
  error(error: unknown): Promise<void> {
    return this.mostrar(typeof error === 'string' ? error : mensajeError(error), 'danger', 6000);
  }

  async confirmar(titulo: string, mensaje: string, accion: string): Promise<boolean> {
    const alerta = await this.alertas.create({
      header: titulo,
      message: mensaje,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: accion, role: 'destructive' },
      ],
    });
    await alerta.present();
    return (await alerta.onDidDismiss()).role === 'destructive';
  }

  private async mostrar(message: string, color: string, duration: number): Promise<void> {
    const toast = await this.toasts.create({
      message,
      color,
      duration,
      position: 'bottom',
      cssClass: 'toast-multilinea',
      buttons: [{ text: 'Cerrar', role: 'cancel' }],
    });
    await toast.present();
  }
}
