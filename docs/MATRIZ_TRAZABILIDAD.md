# Matriz de Trazabilidad – GeoHeat COAC

Cooperativa de Ahorro y Crédito Padre Julián Lorente · Fuente: `Especificacion_Requerimientos_FIS_Reto_Mapa_de_Calor.xlsx`.

19 requisitos: **5 Cumplido** y **14 Parcial**. El estado se asignó contra el criterio de aceptación del
documento; el motivo de cada uno está en la sección 2.

## 1. Matriz

| Requisito | Entidad o modelo | Endpoint de la API | Página de la app | Evidencia (captura) | Estado |
|---|---|---|---|---|---|
| RF-001 – Autenticación y Control | `PerfilUsuario`, `BitacoraAuditoria` | `POST /api/auth/login/` | `login.page.ts` | [Captura 1](capturas/captura-01-login.png), [Captura 2](capturas/captura-02-cuenta-bloqueada-403.png) | Parcial |
| RF-002 – Registro Georreferenciado de Potenciales Socios | `PotencialSocio`, `Barrio` | `/api/potenciales-socios/`, `/api/potenciales-socios/{id}/` | `potencial-socio-lista.page.ts`, `potencial-socio-form.page.ts`, `potencial-socio-detalle.page.ts` | [Captura 3](capturas/captura-03-potencial-socio-validacion-400.png), [Captura 4](capturas/captura-04-potencial-socio-detalle.png) | Parcial |
| RF-003 – Carga Masiva de Archivos CSV | `ArchivoCargaCSV`, `IndicadorBarrio`, `Barrio` | `POST /api/cargas-csv/procesar/`, `/api/cargas-csv/`, `/api/cargas-csv/{id}/` | `carga-csv-lista.page.ts`, `carga-csv-form.page.ts`, `carga-csv-detalle.page.ts` | [Captura 5](capturas/captura-05-csv-procesado.png) | Parcial |
| RF-004 – Validación y Normalización Geográfica ETL | `ArchivoCargaCSV`, `Barrio` | `POST /api/cargas-csv/procesar/`, `GET /api/cargas-csv/{id}/errores/` | `carga-csv-form.page.ts`, `carga-csv-detalle.page.ts` | [Captura 5](capturas/captura-05-csv-procesado.png), [Captura 6](capturas/captura-06-csv-filas-rechazadas.png) | Cumplido |
| RF-005 – Visualización en Mapas Interactivos | `Agencia`, `Barrio`, `IndicadorBarrio` | `GET /api/indicadores/resumen-kpis/`, `/api/agencias/`, `/api/barrios/` | `dashboard-mapa.page.ts`, `agencia-lista.page.ts`, `barrio-lista.page.ts` | [Captura 7](capturas/captura-07-mapa-ficha-barrio.png) | Parcial |
| RF-006 – Generación de Mapas de Calor Multicapa | `IndicadorBarrio`, `Barrio` | `GET /api/indicadores/resumen-kpis/` | `dashboard-mapa.page.ts` | [Captura 7](capturas/captura-07-mapa-ficha-barrio.png), [Captura 8](capturas/captura-08-mapa-calor-morosidad.png) | Parcial |
| RF-007 – Filtros y Segmentación Dinámica | `ZonaComercial`, `Agencia`, `Barrio`, `HojaRutaSemanal`, `PotencialSocio` | `GET /api/indicadores/resumen-kpis/` | `dashboard-mapa.page.ts` | [Captura 9](capturas/captura-09-filtro-zona-1.png) | Parcial |
| RF-008 – Cálculo de Indicadores y Estadísticas Comerciales | `IndicadorBarrio`, `ParametroAnalitico` | `GET /api/indicadores/resumen-kpis/`, `/api/indicadores/`, `/api/indicadores/{id}/` | `dashboard-mapa.page.ts`, `indicador-lista.page.ts`, `indicador-form.page.ts`, `indicador-detalle.page.ts` | [Captura 10](capturas/captura-10-kpis-y-microzonas.png) | Parcial |
| RF-009 – Clasificación en Matriz Estratégica 2x2 | `IndicadorBarrio`, `Barrio`, `ParametroAnalitico` | `/api/indicadores/`, `/api/barrios/`, `/api/parametros/` | `indicador-form.page.ts`, `indicador-detalle.page.ts`, `barrio-lista.page.ts`, `barrio-detalle.page.ts`, `dashboard-mapa.page.ts` | [Captura 11](capturas/captura-11-matriz-2x2-vista-previa.png), [Captura 12](capturas/captura-12-barrios-matriz-2x2.png) | Cumplido |
| RF-010 – Planificación de Hojas de Ruta Semanales | `HojaRutaSemanal`, `Agencia`, `Barrio` | `/api/hojas-ruta/`, `/api/hojas-ruta/{id}/` | `hoja-ruta-lista.page.ts`, `hoja-ruta-form.page.ts`, `hoja-ruta-detalle.page.ts` | [Captura 13](capturas/captura-13-hojas-de-ruta.png) | Parcial |
| RF-011 – Reportería de Supervisión Metodológica e Impacto | `HojaRutaSemanal`, `IndicadorBarrio` | `GET /api/rutas/reporte-cumplimiento/` | `dashboard-mapa.page.ts` | [Captura 14](capturas/captura-14-reporte-cumplimiento.png) | Cumplido |
| RF-012 – Análisis Predictivo de Zonas de Expansión | `IndicadorBarrio`, `Barrio`, `ParametroAnalitico` | `GET /api/indicadores/proyeccion-expansion/` | `dashboard-mapa.page.ts` | [Captura 15](capturas/captura-15-proyeccion-expansion.png) | Parcial |
| RF-013 – Administración de Usuarios, Roles y Parámetros Analíticos | `PerfilUsuario`, `ParametroAnalitico` | `/api/usuarios/`, `/api/usuarios/{id}/`, `/api/parametros/`, `/api/parametros/{id}/` | `usuario-lista.page.ts`, `usuario-form.page.ts`, `usuario-detalle.page.ts`, `parametro-lista.page.ts`, `parametro-form.page.ts`, `parametro-detalle.page.ts` | [Captura 16](capturas/captura-16-usuarios-y-roles.png), [Captura 17](capturas/captura-17-parametros-analiticos.png) | Parcial |
| RF-014 – Trazabilidad y Bitácora de Auditoría | `BitacoraAuditoria` | `/api/bitacora/`, `/api/bitacora/{id}/` | `bitacora-lista.page.ts`, `bitacora-detalle.page.ts` | [Captura 18](capturas/captura-18-bitacora-auditoria.png) | Parcial |
| RNF-001 – Protección de Datos Financieros y Personales (LOPDP) | `PerfilUsuario`, `BitacoraAuditoria` | `POST /api/auth/login/`, `/api/usuarios/` | `login.page.ts`, `usuario-form.page.ts` | [Captura 2](capturas/captura-02-cuenta-bloqueada-403.png), [Captura 18](capturas/captura-18-bitacora-auditoria.png) | Parcial |
| RNF-002 – Tiempo de Respuesta en Renderizado Geoespacial | `IndicadorBarrio`, `Barrio` | `GET /api/indicadores/resumen-kpis/` | `dashboard-mapa.page.ts` | [Captura 8](capturas/captura-08-mapa-calor-morosidad.png) | Cumplido |
| RNF-003 – Diseño Web Responsivo e Intuitivo (Agencia y Campo) | `HojaRutaSemanal`, `PotencialSocio` | `/api/hojas-ruta/`, `/api/potenciales-socios/` | `dashboard-mapa.page.ts`, `hoja-ruta-lista.page.ts`, `potencial-socio-form.page.ts` | [Captura 20](capturas/captura-20-vista-movil.png) | Parcial |
| REST-001 – Arquitectura Modular Desacoplada Preparada para API y ML | Todos los modelos (10) | `/api/docs/`, `/api/schema/`, `POST /api/cargas-csv/procesar/` | `dashboard-mapa.page.ts` | [Captura 21](capturas/captura-21-swagger.png), [Captura 22](capturas/captura-22-admin-django.png) | Parcial |
| REST-002 – Aislamiento del Core Bancario en Fase 1 (MVP) | `ArchivoCargaCSV` | `POST /api/cargas-csv/procesar/` | `carga-csv-form.page.ts` | [Captura 5](capturas/captura-05-csv-procesado.png) | Cumplido |

Todas las rutas de lista admiten `GET` y `POST`; las de detalle (`/{id}/`), `GET`, `PUT`, `PATCH` y `DELETE`.

## 2. Justificación del estado

| Requisito | Estado | Motivo |
|---|---|---|
| RF-001 | Parcial | Hay JWT con rol, bloqueo de 15 min tras 3 intentos y registro en bitácora. Falta restringir cada endpoint según el rol: los ViewSets quedan en AllowAny para la demostración y existe un perfil demo sin contraseña. |
| RF-002 | Parcial | CRUD completo con GPS, marca temporal y validación. Las coordenadas se validan para Ecuador (no por polígono de Loja, Zamora Chinchipe y El Oro), no se puede fijar el pin en el mapa y no se exige el rol. |
| RF-003 | Parcial | Procesa cartera y morosidad: 50.000 filas en 7,5 s sobre MySQL (meta: 10 s). Los CSV de prospectos y censo INEC solo se registran, no se procesan. |
| RF-004 | Cumplido | Valida cabeceras (400), normaliza nombres y aísla las filas inválidas en un log descargable sin interrumpir las válidas. |
| RF-005 | Parcial | Mapa interactivo con zoom, paneo y ficha al pulsar una microzona. No dibuja los polígonos de las 4 zonas ni la ubicación de los socios. |
| RF-006 | Parcial | Cuatro capas con rampa verde-amarillo-rojo y cambio en 0,12 s con 1.852 puntos. Falta la capa "créditos por barrio". |
| RF-007 | Parcial | La pantalla filtra por zona, agencia, cantón, oficial, actividad y cuadrante (0,30 s). La API también filtra por parroquia y barrio, pero esos dos selectores no están en la pantalla. |
| RF-008 | Parcial | Calcula y muestra todos los indicadores con filtros. No se puede verificar contra $43.998.961 y 18.813 créditos: el documento no incluye los datos por barrio y la semilla tiene 24 de 1.852 barrios. |
| RF-009 | Cumplido | El 100 % de los indicadores se clasifica automáticamente en los 4 cuadrantes con su estrategia; regla probada en backend y frontend. |
| RF-010 | Parcial | Planificación semanal con CRUD y validación de semana y agencia. No se genera sola por prioridad o cercanía ni se exporta. |
| RF-011 | Cumplido | Porcentaje de cumplimiento global, por oficial y por agencia, visitas no realizadas y variación de cartera y mora por microzona. |
| RF-012 | Parcial | Ranking georreferenciado con score, demanda y brigadas. Es un score ponderado, no un modelo de Machine Learning, y su correlación de validación no es calculable con la historia sembrada. |
| RF-013 | Parcial | CRUD de usuarios y roles; los umbrales reclasifican la Matriz 2x2 de inmediato. Los roles aún no otorgan permisos distintos. |
| RF-014 | Parcial | Registra usuario, fecha, hora, IP y detalle de cada escritura y acceso. Es de solo lectura en la app y en el admin, pero la API todavía admite modificarla y eliminarla. |
| RNF-001 | Parcial | Contraseñas con PBKDF2, credenciales solo en .env y datos personales fuera de la bitácora. Sin HTTPS/TLS 1.3, cifrado en reposo ni análisis OWASP ZAP. |
| RNF-002 | Cumplido | Con 1.852 microzonas en el equipo de desarrollo: p95 de 0,71 s (40 peticiones, 5 concurrentes, SQLite), mapa completo en 0,62 s; sobre MySQL con 50.000 indicadores, 0,64 s en una petición. Meta: 3 s. |
| RNF-003 | Parcial | Interfaz responsiva verificada a 390 y 1.200 px, sin desborde horizontal. Falta medir SUS >= 80 con usuarios. |
| REST-001 | Parcial | SPA, API REST y base de datos desacopladas, con capa de ingesta independiente (geoheat/etl.py). Usa MySQL por exigencia de la rúbrica, no PostGIS. |
| REST-002 | Cumplido | Base propia geoheat_coac_db; no existe conexión alguna al core financiero y los datos entran solo por CSV o registro controlado. |

## 3. Cobertura CRUD por entidad

| Modelo | Endpoint | Lista | Formulario | Detalle |
|---|---|---|---|---|
| `ZonaComercial` | `/api/zonas/` | `zona-lista.page.ts` | `zona-form.page.ts` | `zona-detalle.page.ts` |
| `Agencia` | `/api/agencias/` | `agencia-lista.page.ts` | `agencia-form.page.ts` | `agencia-detalle.page.ts` |
| `Barrio` | `/api/barrios/` | `barrio-lista.page.ts` | `barrio-form.page.ts` | `barrio-detalle.page.ts` |
| `PotencialSocio` | `/api/potenciales-socios/` | `potencial-socio-lista.page.ts` | `potencial-socio-form.page.ts` | `potencial-socio-detalle.page.ts` |
| `IndicadorBarrio` | `/api/indicadores/` | `indicador-lista.page.ts` | `indicador-form.page.ts` | `indicador-detalle.page.ts` |
| `HojaRutaSemanal` | `/api/hojas-ruta/` | `hoja-ruta-lista.page.ts` | `hoja-ruta-form.page.ts` | `hoja-ruta-detalle.page.ts` |
| `ArchivoCargaCSV` | `/api/cargas-csv/` | `carga-csv-lista.page.ts` | `carga-csv-form.page.ts` | `carga-csv-detalle.page.ts` |
| `ParametroAnalitico` | `/api/parametros/` | `parametro-lista.page.ts` | `parametro-form.page.ts` | `parametro-detalle.page.ts` |
| `PerfilUsuario` | `/api/usuarios/` | `usuario-lista.page.ts` | `usuario-form.page.ts` | `usuario-detalle.page.ts` |
| `BitacoraAuditoria` | `/api/bitacora/` | `bitacora-lista.page.ts` | No aplica (RF-014) | `bitacora-detalle.page.ts` |

`BitacoraAuditoria` es de solo consulta en la app porque RF-014 exige que sea inmutable.

## 4. Índice de capturas

Tomadas en la aplicación en ejecución con los datos de `cargar_datos_coac`, sobre una base SQLite temporal para no alterar MySQL.
Los montos por barrio y las personas son datos de ejemplo.

| Captura | Contenido | Archivo |
|---|---|---|
| Captura 1 | Inicio de sesión | [captura-01-login.png](capturas/captura-01-login.png) |
| Captura 2 | Cuenta bloqueada tras 3 intentos (403) | [captura-02-cuenta-bloqueada-403.png](capturas/captura-02-cuenta-bloqueada-403.png) |
| Captura 3 | Validación 400 en toast rojo | [captura-03-potencial-socio-validacion-400.png](capturas/captura-03-potencial-socio-validacion-400.png) |
| Captura 4 | Detalle con Editar y Eliminar | [captura-04-potencial-socio-detalle.png](capturas/captura-04-potencial-socio-detalle.png) |
| Captura 5 | CSV procesado con filas aisladas | [captura-05-csv-procesado.png](capturas/captura-05-csv-procesado.png) |
| Captura 6 | Log de filas rechazadas | [captura-06-csv-filas-rechazadas.png](capturas/captura-06-csv-filas-rechazadas.png) |
| Captura 7 | Mapa interactivo con ficha del barrio | [captura-07-mapa-ficha-barrio.png](capturas/captura-07-mapa-ficha-barrio.png) |
| Captura 8 | Mapa de calor por morosidad | [captura-08-mapa-calor-morosidad.png](capturas/captura-08-mapa-calor-morosidad.png) |
| Captura 9 | KPIs y mapa filtrados por Zona 1 | [captura-09-filtro-zona-1.png](capturas/captura-09-filtro-zona-1.png) |
| Captura 10 | KPIs y cuadrícula de microzonas | [captura-10-kpis-y-microzonas.png](capturas/captura-10-kpis-y-microzonas.png) |
| Captura 11 | Vista previa de la Matriz 2x2 | [captura-11-matriz-2x2-vista-previa.png](capturas/captura-11-matriz-2x2-vista-previa.png) |
| Captura 12 | Barrios con su cuadrante | [captura-12-barrios-matriz-2x2.png](capturas/captura-12-barrios-matriz-2x2.png) |
| Captura 13 | Hojas de ruta | [captura-13-hojas-de-ruta.png](capturas/captura-13-hojas-de-ruta.png) |
| Captura 14 | Reporte de cumplimiento | [captura-14-reporte-cumplimiento.png](capturas/captura-14-reporte-cumplimiento.png) |
| Captura 15 | Proyección de expansión | [captura-15-proyeccion-expansion.png](capturas/captura-15-proyeccion-expansion.png) |
| Captura 16 | Usuarios y roles | [captura-16-usuarios-y-roles.png](capturas/captura-16-usuarios-y-roles.png) |
| Captura 17 | Parámetros analíticos | [captura-17-parametros-analiticos.png](capturas/captura-17-parametros-analiticos.png) |
| Captura 18 | Bitácora de auditoría | [captura-18-bitacora-auditoria.png](capturas/captura-18-bitacora-auditoria.png) |
| Captura 19 | Confirmación antes de eliminar | [captura-19-confirmar-eliminacion.png](capturas/captura-19-confirmar-eliminacion.png) |
| Captura 20 | Vista móvil | [captura-20-vista-movil.png](capturas/captura-20-vista-movil.png) |
| Captura 21 | Swagger | [captura-21-swagger.png](capturas/captura-21-swagger.png) |
| Captura 22 | Administración de Django | [captura-22-admin-django.png](capturas/captura-22-admin-django.png) |
