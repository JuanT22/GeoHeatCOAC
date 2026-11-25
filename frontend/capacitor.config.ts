import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ec.edu.utpl.geoheatcoac',
  appName: 'GeoHeat COAC',
  webDir: 'dist/frontend/browser',
  // HTTP sin cifrar: la app se comunica con http://10.0.2.2:8000 durante el desarrollo.
  server: { androidScheme: 'http', cleartext: true },
};

export default config;
