# 🚀 Admin Environments - Sistema de Gestión de Ambientes

Sistema fullstack para gestionar el estado de los ambientes **dev4** y **test4** en tiempo real, con notificaciones automáticas a Slack.

> 📚 **[Ver Índice Completo de Documentación](INDEX.md)** | ⚡ **[Guía de Setup Rápido](SETUP.md)** | 🧪 **[Guía de Testing](TESTING.md)**

## 📋 Descripción

Esta aplicación permite al equipo de desarrollo:

- ✅ Visualizar el estado actual de los ambientes (Libre/Ocupado)
- ✅ Registrar despliegues con rama y responsable
- ✅ Liberar ambientes cuando están disponibles
- ✅ Recibir notificaciones automáticas en Slack
- ✅ Evitar confusiones sobre qué rama está desplegada
- ✅ Solicitar y gestionar revisiones de QA por equipo, con asignación automática de revisor

## 🏗️ Arquitectura

### Backend
- **Framework**: Node.js + Express
- **Base de Datos**: MongoDB Atlas
- **Notificaciones**: Slack Webhooks

### Frontend
- **Framework**: Angular 17+
- **UI Components**: Angular Material
- **Estilos**: SCSS

## 📦 Estructura del Proyecto

```
admin-environments/
├── backend/
│   ├── config/
│   │   └── db.js                    # Configuración MongoDB
│   ├── models/
│   │   └── Environment.js           # Modelo de datos
│   ├── routes/
│   │   └── environments.js          # API REST endpoints
│   ├── services/
│   │   └── slackService.js          # Integración Slack
│   ├── .env                         # Variables de entorno
│   ├── package.json
│   └── server.js                    # Servidor principal
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── components/
    │   │   │   ├── dashboard/       # Dashboard principal
    │   │   │   └── deploy-dialog/   # Diálogo de despliegue
    │   │   ├── models/              # Interfaces TypeScript
    │   │   └── services/            # Servicios HTTP
    │   ├── proxy.conf.json          # Proxy configuración
    │   └── index.html
    ├── angular.json
    └── package.json
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Node.js** >= 20.19.0 (recomendado v22.x)
- **npm** >= 8.0.0
- **MongoDB Atlas** (cuenta configurada)
- **Slack Incoming Webhook URL** para cada equipo

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd admin-environments
```

### 2. Configurar Backend

```bash
cd backend
npm install
```

Edita el archivo `.env` con tus credenciales:

```env
MONGODB_URI=mongodb+srv://frpatino6Coffe:s4ntiago@mycoffecluster.yerjpro.mongodb.net/environment-algo
PORT=3000
```

Slack no se configura en `.env`. Cada equipo guarda su webhook en MongoDB, en el campo `Team.slackWebhookUrl`.

**Para obtener y configurar tu Slack Webhook URL:**
1. Ve a https://api.slack.com/apps
2. Crea una nueva app o selecciona una existente
3. Habilita "Incoming Webhooks"
4. Crea un nuevo webhook para tu canal deseado
5. Copia la URL
6. Configurala desde el boton "Slack" del dashboard, o por API:
   ```bash
   curl -X PATCH http://localhost:3000/api/teams/xqo/slack-webhook \
     -H "Content-Type: application/json" \
     -d '{"slackWebhookUrl":"https://hooks.slack.com/services/YOUR/WEBHOOK/URL"}'
   ```

### 3. Configurar Frontend

```bash
cd frontend
npm install
```

### 4. Inicializar Ambientes en MongoDB

Ejecuta este comando una vez para crear los ambientes iniciales:

```bash
# Desde la raíz del proyecto backend
curl -X POST http://localhost:3000/api/environments/init
```

O desde el navegador visita: `http://localhost:3000/api/environments/init`

## ▶️ Ejecución Local

### Comandos Rápidos (Windows con NVM)

Si tienes Node 12 globalmente pero necesitas usar Node 20 para este proyecto:

**Terminal 1 - Backend:**
```powershell
cd D:\GitFlyr\admin-environments\backend
C:\ProgramData\nvm\v20.20.0\npm.cmd start
# O con node directamente:
Set-Location D:\GitFlyr\admin-environments\backend
C:\ProgramData\nvm\v20.20.0\node.exe .\server.js
```

**Terminal 2 - Frontend:**
```powershell
cd D:\GitFlyr\admin-environments\frontend
$env:Path = "C:\ProgramData\nvm\v20.20.0;$env:Path"
npm start
```

**URLs:**
- Backend API: `http://localhost:3000/api`
- Frontend: `http://localhost:4200`

### Desarrollo (Linux/Mac o Node 20 global)

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
El servidor estará en `http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```
La aplicación estará en `http://localhost:4200`

### Solución de Problemas Comunes

**Error: "The Angular CLI requires a minimum Node.js version of v18.13"**
- Asegúrate de usar Node 20+
- En Windows con nvm: `$env:Path = "C:\ProgramData\nvm\v20.20.0;$env:Path"`
- Verifica versión: `node --version` (debe mostrar v20.x.x)

**El frontend apunta a producción en lugar de localhost**
- Verifica que estés en modo desarrollo: `npm start` (no `npm run build`)
- El archivo `angular.json` debe tener `fileReplacements` en la sección `development`
- Refresca el navegador con Ctrl+F5

**Backend no conecta a MongoDB**
- Verifica tu conexión a internet
- Revisa que tu IP esté en la lista blanca de MongoDB Atlas
- Ve a: https://cloud.mongodb.com → Network Access → Add IP Address

> Ajusta la ruta de nvm según tu instalación. Usa `nvm list` para ver las versiones instaladas.

### Producción

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Los archivos estarán en dist/
```

## 🔌 API Endpoints

### Obtener todos los ambientes
```http
GET /api/environments
```

### Obtener un ambiente específico
```http
GET /api/environments/:name
```

### Desplegar rama (Ocupar ambiente)
```http
POST /api/environments/:name/deploy
Content-Type: application/json

{
  "branch": "feature/nueva-funcionalidad",
  "deployedBy": "Juan Pérez"
}
```

### Liberar ambiente
```http
POST /api/environments/:name/release
```

### Inicializar ambientes
```http
POST /api/environments/init
```

## 📱 Uso de la Aplicación

### Dashboard Principal

![Dashboard](https://via.placeholder.com/800x400?text=Dashboard+Screenshot)

1. **Visualizar Estado**: Cada tarjeta muestra dev4 o test4 con su estado actual
2. **Desplegar Rama**: Click en "Desplegar Rama" cuando el ambiente está libre
3. **Completar Formulario**: Ingresa el nombre de la rama y tu nombre
4. **Recibir Notificación**: Automáticamente se envía mensaje a Slack
5. **Liberar Ambiente**: Cuando QA termina, hace click en "Liberar Ambiente"

### Notificaciones Slack

**Cuando se ocupa un ambiente:**
```
🚀 Ambiente dev4 ocupado con la rama feature/nueva-funcionalidad por Juan Pérez.
```

**Cuando se libera un ambiente:**
```
✅ Ambiente test4 ha sido liberado y está disponible para despliegue.
```

## 🔍 Solicitudes y Revisión de QA

Además de gestionar el estado de los ambientes, la aplicación permite solicitar y gestionar revisiones de QA directamente desde un ambiente ocupado.

- ✅ Solicitar QA con un clic desde la tarjeta del ambiente ocupado (ticket de Jira + resumen)
- ✅ Asignación automática del siguiente revisor disponible en el **roster de QA del mismo equipo**, excluyendo al solicitante y priorizando menor carga activa (desempate: quien lleva más tiempo sin ser asignado)
- ✅ Notificación al mismo webhook de Slack del equipo (el que ya usan los despliegues/releases) con botones "Iniciar QA" y "Rechazar"
- ✅ Rechazar una solicitud requiere indicar una razón y reasigna automáticamente al siguiente candidato, excluyendo a todos los que ya rechazaron esa solicitud (nunca reasigna solo por falta de respuesta — solo se reenvía un recordatorio)
- ✅ Reintentar QA con el mismo revisor con un clic, una vez atendidos los cambios solicitados
- ✅ Página `teams/:slug/qa` con la cola completa de solicitudes del equipo y gestión de su roster de revisores

### Variables de entorno para QA

```env
FRONTEND_BASE_URL=http://localhost:4200
JIRA_BASE_URL=
QA_REMINDER_INTERVAL_HOURS=4
QA_ESCALATION_CHECK_INTERVAL_MIN=15
```

> No se requiere ninguna configuración adicional de Slack (sin bot token, sin Interactivity habilitada): los botones "Iniciar QA" y "Rechazar" son enlaces que abren páginas del frontend desplegado, y las notificaciones reutilizan el mismo Incoming Webhook por equipo que ya usan despliegues y releases. Ver [SLACK_SETUP.md](SLACK_SETUP.md).

### Endpoints de QA

```http
GET   /api/qa/members?team=:team
POST  /api/qa/members
PATCH /api/qa/members/:id/active

GET   /api/qa/requests
GET   /api/qa/requests/:id
POST  /api/qa/requests
POST  /api/qa/requests/:id/start
POST  /api/qa/requests/:id/reject
POST  /api/qa/requests/:id/retry
POST  /api/qa/requests/:id/complete
```

## 🎨 Características de UI

- ✅ **Material Design**: Interfaz moderna con Angular Material
- ✅ **Responsive**: Funciona en desktop, tablet y móvil
- ✅ **Indicadores Visuales**: Colores distintivos para estados Libre/Ocupado
- ✅ **Feedback Inmediato**: Notificaciones snackbar en cada acción
- ✅ **Actualización Manual**: Botón de refresh para ver cambios

## 🔒 Seguridad

- Las variables sensibles están en `.env` (no en git)
- CORS configurado para desarrollo local
- Validación de datos en backend y frontend

## 🐛 Troubleshooting

### Error: "Cannot connect to MongoDB"
- Verifica que tu IP está en la whitelist de MongoDB Atlas
- Revisa las credenciales en `.env`

### Error: Node.js version
- Actualiza Node.js a la versión 20.19+ o 22.12+
- Usa `nvm` para gestionar versiones de Node.js

### Slack no recibe notificaciones
- Verifica que el equipo tenga `slackWebhookUrl` configurado en MongoDB
- Puedes actualizarlo desde el boton "Slack" del dashboard o con `PATCH /api/teams/:team/slack-webhook`
- Prueba el webhook con curl:
  ```bash
  curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' \
  YOUR_WEBHOOK_URL
  ```

## 📝 Próximas Mejoras

- [ ] WebSockets para actualización en tiempo real
- [ ] Historial de despliegues
- [ ] Autenticación de usuarios
- [ ] Dashboard de métricas
- [ ] Integración con CI/CD

## 👥 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

ISC

## 👨‍💻 Autor

Desarrollado por el equipo de GitFlyr

---

**¿Preguntas?** Abre un issue en el repositorio.
