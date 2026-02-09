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
- **Slack Webhook URL**

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
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Para obtener tu Slack Webhook URL:**
1. Ve a https://api.slack.com/apps
2. Crea una nueva app o selecciona una existente
3. Habilita "Incoming Webhooks"
4. Crea un nuevo webhook para tu canal deseado
5. Copia la URL y pégala en el `.env`

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
- Verifica que `SLACK_WEBHOOK_URL` está correctamente configurada
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
