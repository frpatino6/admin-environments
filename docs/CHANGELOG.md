# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-09-28

### 🎉 Horario de Negocio para los Recordatorios de QA

El job de escalación enviaba recordatorios las 24 horas, todos los días, y saturaba el canal de Slack del equipo durante los fines de semana. Ahora los recordatorios solo se envían dentro de una ventana de horario de negocio configurable (lunes a viernes, 09:00-18:00 por defecto).

### ✨ Agregado

#### Backend
- `services/qaReminderSchedule.js`: módulo puro (sin base de datos ni dependencias) que resuelve la ventana de recordatorios desde variables de entorno y decide, para un instante dado, si el recordatorio puede enviarse. Sin dependencias nuevas: solo `Intl`
- El día de la semana se configura con **números ISO** (1 = lunes … 7 = domingo) y la hora final es **exclusiva** (con `9`–`18` el último recordatorio sale a las 17:59)
- La zona horaria se toma de `QA_REMINDER_TIMEZONE`, nunca del reloj del servidor; si no es válida se ignora con un warning y se usa la zona del servidor
- Cualquier valor mal configurado (horas no numéricas o fuera de rango, hora final ≤ hora inicial, zona IANA inexistente, lista de días vacía o inválida) genera un warning y cae al valor por defecto: una variable mal escrita nunca puede tumbar el arranque
- Nuevas variables de entorno: `QA_REMINDER_TIMEZONE`, `QA_REMINDER_START_HOUR`, `QA_REMINDER_END_HOUR`, `QA_REMINDER_WEEKDAYS`
- Pruebas del módulo puro (`qaReminderSchedule.test.js`, sin MongoDB) y de la compuerta dentro de `sendOverdueReminders` (`qaRequestsReminderWindow.test.js`, contra la base de datos real)

### 🔧 Cambiado

#### Backend
- `sendOverdueReminders` ahora verifica la ventana **antes de cualquier consulta o llamada a Slack**: fuera de ella devuelve `0` y no toca ni `lastReminderAt` ni `escalatedCount`. La compuerta vive en el servicio (y no solo en el job) para que la garantía se cumpla aunque alguien lo invoque directamente
- Fuera de la ventana no se envía ni se acumula nada: una solicitud que se quedó parada el viernes a las 22:00 no recibe recordatorios ese fin de semana, y el siguiente barrido dentro del horario la retoma con normalidad (sin ráfaga de catch-up)
- `jobs/qaEscalation.js` salta la llamada por completo cuando la ventana está cerrada (ni siquiera consulta la base de datos) y registra el estado pausado solo en la transición, ya que despierta ~96 veces al día. La línea de arranque ahora incluye el horario configurado
- Esta ventana aplica **únicamente al recordatorio**: la asignación inicial y las notificaciones de inicio, rechazo, completado y cambios atendidos se siguen enviando a cualquier hora

#### Documentación
- `backend/.env.example`, `docs/CLAUDE.md`, `docs/README.md` e `INDEX.md` actualizados con las nuevas variables y el módulo de horario

## [1.1.0] - 2026-09-18

### 🎉 Flujo de Solicitud y Revisión de QA

Se agregó un flujo completo de solicitud y revisión de QA por equipo, con asignación automática de revisor y notificaciones a Slack.

### ✨ Agregado

#### Backend
- Modelo `QaMember`: roster de revisores de QA, ahora por equipo (`team`, `active`, `lastAssignedAt`)
- Modelo `QaRequest`: solicitud de QA con estado (`pending`/`in_progress`/`approved`/`changes_requested`/`unassignable`), historial de rechazos y timestamps
- `services/qaAssignment.js`: algoritmo puro de asignación — excluye al solicitante (y a quienes ya rechazaron la solicitud), prioriza menor carga activa, desempata por quien lleva más tiempo sin ser asignado
- `services/qaRequestsService.js`: creación, inicio, rechazo (con reasignación automática), reintento (mismo revisor) y finalización de solicitudes de QA, con guardas de team-scoping y concurrencia
- `services/qaSlackService.js`: notificaciones a Slack que reutilizan el webhook por equipo ya existente — sin necesidad de bot token, Interactivity ni Signing Secret
- `jobs/qaEscalation.js`: job en segundo plano (`setInterval`) que reenvía (no reasigna) recordatorios de solicitudes pendientes
- `routes/qa.js`: endpoints `/api/qa/members` y `/api/qa/requests` (ver README.md)
- Nuevas variables de entorno: `FRONTEND_BASE_URL`, `JIRA_BASE_URL`, `QA_REMINDER_INTERVAL_HOURS`, `QA_ESCALATION_CHECK_INTERVAL_MIN`
- Primera infraestructura de pruebas automatizadas del backend (`backend/test/`, ejecutable con `node --test test/`)

#### Frontend
- `components/qa-dashboard/`: página `teams/:slug/qa` con la cola de solicitudes del equipo y gestión de su roster de QA
- `components/qa-request-dialog/`: solicitar QA desde una tarjeta de ambiente ocupado
- `components/qa-reject-dialog/`, `components/qa-reject-page/`, `components/qa-start-page/`: flujo de rechazo (con razón obligatoria) e inicio de revisión, alcanzados desde los enlaces de Slack
- Indicador de estado de QA en `environment-card` y acción para solicitar QA en `dashboard`
- Nuevas rutas: `teams/:slug/qa`, `qa/requests/:id/start`, `qa/requests/:id/reject`

#### Documentación
- CLAUDE.md, README.md, TESTING.md y SLACK_SETUP.md actualizados con el flujo de QA

## [1.0.0] - 2026-02-02

### 🎉 Lanzamiento Inicial

Primera versión funcional completa de Admin Environments.

### ✨ Agregado

#### Backend
- Servidor Express.js con Node.js
- API REST completa para gestión de ambientes
- Modelo de datos Environment con Mongoose
- Integración con MongoDB Atlas
- Servicio de notificaciones Slack
- Endpoints:
  - `GET /health` - Health check
  - `GET /api/environments` - Obtener todos los ambientes
  - `GET /api/environments/:name` - Obtener ambiente específico
  - `POST /api/environments/init` - Inicializar ambientes
  - `POST /api/environments/:name/deploy` - Desplegar rama
  - `POST /api/environments/:name/release` - Liberar ambiente
- Manejo de errores robusto
- Validación de datos de entrada
- CORS habilitado para desarrollo
- Variables de entorno con dotenv

#### Frontend
- Aplicación Angular 17 standalone
- Dashboard interactivo con Angular Material
- Componente principal Dashboard
- Componente DeployDialog para formulario de despliegue
- Servicio HTTP EnvironmentService
- Modelo de datos TypeScript
- Visualización de estado de ambientes (Libre/Ocupado)
- Indicadores visuales con colores
- Notificaciones snackbar para feedback
- Diseño responsive (desktop, tablet, mobile)
- Proxy configurado para desarrollo
- Iconos Material Design
- SCSS para estilos personalizados

#### Documentación
- README.md principal completo
- SETUP.md - Guía de configuración rápida
- SLACK_SETUP.md - Configuración de Slack webhooks
- TESTING.md - Guía completa de pruebas
- COMMANDS.md - Comandos frecuentes
- VISUAL_GUIDE.md - Guía visual con diagramas
- PROJECT_SUMMARY.md - Resumen ejecutivo
- INDEX.md - Índice de toda la documentación
- CONTRIBUTING.md - Guía de contribución
- CHANGELOG.md - Este archivo
- README.md para backend y frontend

#### DevOps
- Scripts de inicio (start.ps1 para Windows, start.sh para Linux/Mac)
- Configuración VS Code tasks
- Extensiones recomendadas para VS Code
- .gitignore configurado
- Thunder Client collection para testing API
- Variables de entorno template (.env.example)

### 🎨 Características

- ✅ Gestión de dos ambientes: dev4 y test4
- ✅ Estados: Libre y Ocupado
- ✅ Registro de rama desplegada
- ✅ Registro de usuario responsable
- ✅ Timestamp de despliegue
- ✅ Notificaciones automáticas a Slack
- ✅ Interfaz moderna y limpia
- ✅ Actualización manual con botón refresh
- ✅ Confirmación antes de liberar ambiente
- ✅ Validación de formularios
- ✅ Manejo de errores en UI
- ✅ Loading states

### 🔧 Tecnologías Utilizadas

- **Backend**: Node.js, Express.js 4.x, Mongoose 8.x, Axios
- **Frontend**: Angular 17, Angular Material, RxJS, TypeScript 5.4
- **Base de Datos**: MongoDB Atlas
- **Integración**: Slack Webhooks
- **Herramientas**: VS Code, Thunder Client, Git

### 📚 Estadísticas

- **Archivos creados**: 60+
- **Líneas de código**: ~2000+
- **Componentes Angular**: 2
- **API Endpoints**: 6
- **Documentos**: 15+

---

## Formato de Versiones

Este proyecto usa [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Cambios incompatibles en la API
- **MINOR** (0.X.0): Nuevas funcionalidades compatibles
- **PATCH** (0.0.X): Bug fixes compatibles

## Tipos de Cambios

- **Agregado** (Added): Nuevas funcionalidades
- **Cambiado** (Changed): Cambios en funcionalidad existente
- **Deprecado** (Deprecated): Funcionalidad que se eliminará pronto
- **Removido** (Removed): Funcionalidad eliminada
- **Corregido** (Fixed): Corrección de bugs
- **Seguridad** (Security): Parches de seguridad

## Próximos Cambios Planeados

### [1.1.0] - TBD

#### Planeado
- [ ] WebSockets para actualización en tiempo real
- [ ] Historial de despliegues
- [ ] Filtros y búsqueda
- [ ] Export de datos (CSV/Excel)
- [ ] Autenticación básica

### [1.2.0] - TBD

#### Planeado
- [ ] Tests unitarios (Jest para backend, Karma/Jasmine para frontend)
- [ ] Tests E2E (Playwright)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker containers
- [ ] Dashboard de métricas

### [2.0.0] - TBD

#### Planeado
- [ ] Soporte multi-tenant
- [ ] Role-based access control (RBAC)
- [ ] API versioning
- [ ] GraphQL endpoint (adicional a REST)
- [ ] Mobile app (React Native)

---

## Enlaces

- [Repositorio](https://github.com/...)
- [Issues](https://github.com/.../issues)
- [Pull Requests](https://github.com/.../pulls)

## Mantenedores

- Equipo GitFlyr

---

**Nota:** Para contribuir, por favor lee [CONTRIBUTING.md](CONTRIBUTING.md)
