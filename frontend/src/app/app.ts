import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { registrarIconos } from './core/iconos';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
})
export class App {
  constructor() {
    registrarIconos();
  }
}
