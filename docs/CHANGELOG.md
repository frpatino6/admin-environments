# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
