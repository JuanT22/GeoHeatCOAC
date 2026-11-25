# Constitución Técnica del Proyecto – GeoHeat COAC (Reto Mapa de Calor)

## 1. Contexto del Negocio y Fuente de Verdad
- **Proyecto:** GeoHeat COAC – Plataforma de Análisis de Datos Geoespaciales con Mapas de Calor y Dashboard Predictivo para Microzonas Comerciales (Cooperativa de Ahorro y Crédito Padre Julián Lorente).
- **Documento oficial de requisitos:** `docs/Especificacion_Requerimientos_FIS_Reto_Mapa_de_Calor.xlsx`. Antes de generar código o la matriz de trazabilidad, lee todas sus hojas con Python (`openpyxl`) para extraer los códigos exactos (`RF-001` a `RF-014` y `RNF`), nombres y entidades.
- **Datos reales de referencia del negocio:** Cartera total $43.998.961, 18.813 créditos, 1.852 barrios, 4 zonas comerciales (`Zona 1 - Norte`, `Zona 2 - R5`, `Zona 3 - R5`, `Zona 4 - R5`), agencias (`Oficina Norte`, `Catamayo`, `Cariamanga`, `Catacocha`, `Celica`, `Malacatos`, `Palanda`, `Vilcabamba`, `Zumba`, `Pasaje`, `Piñas`) y barrios de Loja (`San Sebastián`, `La Pradera`, `El Rosal`, `El Capulí`, `La Argelia`).

## 2. Reglas Obligatorias de Evaluación (Rúbrica 10/10)
1. **Backend Django + MySQL (`backend/`):**
   - Base de datos MySQL en puerto `3306`, nombre `geoheat_coac_db`, usando `PyMySQL` (`pymysql.install_as_MySQLdb()` en `config/__init__.py`) y `python-dotenv`.
   - **Cero credenciales en el código:** Toda configuración sensible va en `backend/.env` (con plantilla `backend/.env.example` versionada).
   - `ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '10.0.2.2']`
   - `CORS_ALLOWED_ORIGINS = ['http://localhost:8100', 'http://localhost:4200', 'https://localhost', 'http://localhost']`
   - Cada entidad del documento de requisitos debe tener: modelo con relaciones (`ForeignKey`) y validadores, serializador con validaciones de negocio (`400 Bad Request`), `ModelViewSet` con CRUD completo (`GET` 200, `POST` 201, `PUT/PATCH` 200, `DELETE` 204, `404`), rutas en `DefaultRouter`, registro completo en `admin.py` y documentación Swagger en `/api/docs/` (`drf-spectacular`).
2. **Frontend Angular + Ionic (`frontend/`):**
   - Seguir estrictamente la arquitectura de la guía de clase:
     - `src/app/app.config.ts` (`provideHttpClient()`, `provideIonicAngular()`, `IonicRouteStrategy`)
     - `src/app/app.routes.ts` (rutas con `loadComponent`, colocando rutas `/nuevo` y `/:id/editar` antes de `/:id`)
     - `src/app/core/api.config.ts` (`Capacitor.getPlatform() === 'android' ? 'http://10.0.2.2:8000/api' : 'http://127.0.0.1:8000/api'`)
     - `src/app/core/modelos.ts` (interfaces TypeScript)
     - `src/app/core/matriz-estrategica.ts` + `matriz-estrategica.spec.ts` (funciones puras de la Matriz 2x2 y pruebas unitarias)
     - `src/app/core/geoheat-api.service.ts` (llamadas HTTP CRUD y función `mensajeError(error)` que extrae mensajes de validación `400` de DRF)
     - `src/app/core/geoheat.service.ts` (estado reactivo con RxJS: `BehaviorSubject`, `switchMap`, `combineLatest`, `debounceTime`, `shareReplay(1)`)
     - `src/app/paginas/` (prohibido poner `HttpClient` dentro de las páginas; **cada entidad** debe tener vista de **lista**, **formulario crear/editar** y **detalle con botón eliminar**).
   - **Ionic 9:** Importar TODOS los componentes y servicios (`ToastController`, `AlertController`, `IonicRouteStrategy`, `provideIonicAngular`, `Ion*`) exclusivamente desde `@ionic/angular` (NUNCA desde `@ionic/angular/standalone`). Declarar en el array `imports` de cada `@Component` todos los elementos `ion-*` usados en su plantilla.
   - Debe compilar sin errores con `npm run build` y pasar `npx ng test --watch=false`.
3. **Aplicación Android (`frontend/android/`):**
   - `capacitor.config.ts` con `appId: 'ec.edu.utpl.geoheatcoac'`, `appName: 'GeoHeat COAC'`, `webDir: 'dist/frontend/browser'`, `server: { androidScheme: 'http', cleartext: true }`.
   - `AndroidManifest.xml` con `android:usesCleartextTraffic="true"` y permiso `INTERNET`.
   - `strings.xml` con `app_name` = `GeoHeat COAC`.
4. **Matriz de Trazabilidad:**
   - Generar `docs/MATRIZ_TRAZABILIDAD.md` y `docs/Matriz_Trazabilidad_GeoHeat_COAC.xlsx` con las 6 columnas exactas exigidas: `Requisito | Entidad o modelo | Endpoint de la API | Página de la app | Evidencia (captura) | Estado`.
