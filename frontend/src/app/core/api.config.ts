import { Capacitor } from '@capacitor/core';

/** 10.0.2.2 es la dirección del computador anfitrión vista desde el emulador de Android. */
export function urlApi(): string {
  return Capacitor.getPlatform() === 'android'
    ? 'http://10.0.2.2:8000/api'
    : 'http://127.0.0.1:8000/api';
}
