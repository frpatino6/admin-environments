# 🎨 Guía Visual - Admin Environments

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                 │
│                    (Navegador Web)                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular 17)                         │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │   Dashboard    │  │  Deploy Dialog   │  │   Environment  │ │
│  │   Component    │  │    Component     │  │    Service     │ │
│  └────────────────┘  └──────────────────┘  └────────────────┘ │
│         │                    │                       │          │
│         └────────────────────┴───────────────────────┘          │
│                              │                                   │
│                              │ HTTP (Proxy :4200 → :3000)       │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js + Express)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │   Routes     │  │    Models    │  │   Slack Service    │   │
│  │ environments │  │ Environment  │  │  (Webhooks)        │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
│         │                  │                    │               │
│         └──────────────────┴────────────────────┘               │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                ┌────────────┴─────────────┐
                │                          │
                ▼                          ▼
    ┌────────────────────┐     ┌───────────────────┐
    │  MongoDB Atlas     │     │   Slack Channel   │
    │  (Database)        │     │  (Notificaciones) │
    └────────────────────┘     └───────────────────┘
```

## 📊 Flujo de Datos - Desplegar Rama

```
┌─────────┐
│ Usuario │
│  hace   │
│  click  │
└────┬────┘
     │
     ▼
┌──────────────────────┐
│ Dashboard Component  │
│ openDeployDialog()   │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│  Deploy Dialog       │
│  [Formulario]        │
│  - Rama              │
│  - Usuario           │
└─────────┬────────────┘
          │
          │ onDeploy()
          ▼
┌──────────────────────┐
│ Dashboard Component  │
│ deployBranch()       │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│ Environment Service  │
│ deploy(name, data)   │
└─────────┬────────────┘
          │
          │ HTTP POST /api/environments/:name/deploy
          ▼
┌──────────────────────┐
│ Backend Route        │
│ POST /deploy         │
└─────────┬────────────┘
          │
          ├──────────────────────────┐
          │                          │
          ▼                          ▼
┌──────────────────┐      ┌─────────────────────┐
│ MongoDB Update   │      │ Slack Notification  │
│ Status: Ocupado  │      │ 🚀 Ambiente ocupado │
│ Branch: feature  │      └─────────────────────┘
│ User: Juan       │
└──────────┬───────┘
           │
           │ Response
           ▼
┌──────────────────────┐
│ Frontend actualiza   │
│ UI con nuevo estado  │
└──────────────────────┘
```

## 🔄 Flujo de Datos - Liberar Ambiente

```
┌─────────┐
│ Usuario │
│  click  │
│ Liberar │
└────┬────┘
     │
     ▼
┌──────────────────────┐
│ Confirmación         │
│ ¿Estás seguro?       │
└─────────┬────────────┘
          │
          │ Aceptar
          ▼
┌──────────────────────┐
│ Environment Service  │
│ release(name)        │
└─────────┬────────────┘
          │
          │ HTTP POST /api/environments/:name/release
          ▼
┌──────────────────────┐
│ Backend Route        │
│ POST /release        │
└─────────┬────────────┘
          │
          ├──────────────────────────┐
          │                          │
          ▼                          ▼
┌──────────────────┐      ┌─────────────────────┐
│ MongoDB Update   │      │ Slack Notification  │
│ Status: Libre    │      │ ✅ Ambiente libre   │
│ Branch: null     │      └─────────────────────┘
│ User: null       │
└──────────┬───────┘
           │
           │ Response
           ▼
┌──────────────────────┐
│ Frontend actualiza   │
│ UI: Estado Libre     │
└──────────────────────┘
```

## 🗂️ Estructura de Archivos Detallada

```
admin-environments/
│
├── 📁 backend/
│   ├── 📁 config/
│   │   └── 📄 db.js                    [Configuración MongoDB]
│   ├── 📁 models/
│   │   └── 📄 Environment.js           [Schema Mongoose]
│   ├── 📁 routes/
│   │   └── 📄 environments.js          [API Endpoints]
│   ├── 📁 services/
│   │   └── 📄 slackService.js          [Notificaciones]
│   ├── 📄 .env                         [Variables de entorno]
│   ├── 📄 .env.example                 [Template]
│   ├── 📄 .gitignore
│   ├── 📄 package.json                 [Dependencies]
│   ├── 📄 server.js                    [Entry point]
│   └── 📄 README.md
│
├── 📁 frontend/
│   ├── 📁 src/
│   │   ├── 📁 app/
│   │   │   ├── 📁 components/
│   │   │   │   ├── 📁 dashboard/
│   │   │   │   │   ├── 📄 dashboard.component.ts
│   │   │   │   │   ├── 📄 dashboard.component.html
│   │   │   │   │   └── 📄 dashboard.component.scss
│   │   │   │   └── 📁 deploy-dialog/
│   │   │   │       ├── 📄 deploy-dialog.component.ts
│   │   │   │       ├── 📄 deploy-dialog.component.html
│   │   │   │       └── 📄 deploy-dialog.component.scss
│   │   │   ├── 📁 models/
│   │   │   │   └── 📄 environment.model.ts
│   │   │   ├── 📁 services/
│   │   │   │   └── 📄 environment.service.ts
│   │   │   ├── 📄 app.component.ts
│   │   │   ├── 📄 app.component.scss
│   │   │   └── 📄 app.routes.ts
│   │   ├── 📁 assets/
│   │   ├── 📁 environments/
│   │   │   ├── 📄 environment.ts
│   │   │   └── 📄 environment.development.ts
│   │   ├── 📄 index.html
│   │   ├── 📄 main.ts
│   │   ├── 📄 proxy.conf.json
│   │   └── 📄 styles.scss
│   ├── 📄 angular.json
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   ├── 📄 tsconfig.app.json
│   ├── 📄 tsconfig.spec.json
│   └── 📄 README.md
│
├── 📁 .vscode/
│   ├── 📄 tasks.json
│   ├── 📄 extensions.json
│   └── 📄 README.md
│
├── 📄 .gitignore
├── 📄 README.md               [Documentación principal]
├── 📄 SETUP.md                [Guía de configuración]
├── 📄 SLACK_SETUP.md          [Setup Slack]
├── 📄 TESTING.md              [Guía de pruebas]
├── 📄 PROJECT_SUMMARY.md      [Resumen del proyecto]
├── 📄 COMMANDS.md             [Comandos rápidos]
├── 📄 VISUAL_GUIDE.md         [Este archivo]
├── 📄 thunder-collection.json [API Collection]
├── 📄 start.ps1               [Script Windows]
└── 📄 start.sh                [Script Linux/Mac]
```

## 💾 Modelo de Datos MongoDB

```javascript
Environment {
  _id: ObjectId("..."),           // Auto-generado
  name: "dev4" | "test4",         // Enum, requerido, único
  status: "Libre" | "Ocupado",    // Enum, default: "Libre"
  branch: "feature/xyz" | null,   // String o null
  deployedBy: "Juan Pérez" | null, // String o null
  deployedAt: Date | null,        // Date o null
  createdAt: Date,                // Auto timestamp
  updatedAt: Date                 // Auto timestamp
}
```

**Ejemplo de documento Libre:**
```json
{
  "_id": "65b7c8d9e4f1234567890abc",
  "name": "dev4",
  "status": "Libre",
  "branch": null,
  "deployedBy": null,
  "deployedAt": null,
  "createdAt": "2026-02-02T10:00:00.000Z",
  "updatedAt": "2026-02-02T10:00:00.000Z"
}
```

**Ejemplo de documento Ocupado:**
```json
{
  "_id": "65b7c8d9e4f1234567890abc",
  "name": "dev4",
  "status": "Ocupado",
  "branch": "feature/nueva-funcionalidad",
  "deployedBy": "Juan Pérez",
  "deployedAt": "2026-02-02T14:30:00.000Z",
  "createdAt": "2026-02-02T10:00:00.000Z",
  "updatedAt": "2026-02-02T14:30:00.000Z"
}
```

## 🎨 Estados de la UI

### Estado 1: Cargando
```
┌────────────────────────────────┐
│    🔄 Cargando ambientes...    │
│         [Spinner]              │
└────────────────────────────────┘
```

### Estado 2: Ambos Libres
```
┌─────────────────────┐  ┌─────────────────────┐
│ DEV4   [Libre 🟢]   │  │ TEST4  [Libre 🟢]   │
│                     │  │                     │
│ ✓ Disponible        │  │ ✓ Disponible        │
│                     │  │                     │
│ [🚀 Desplegar]      │  │ [🚀 Desplegar]      │
└─────────────────────┘  └─────────────────────┘
```

### Estado 3: Uno Ocupado, Uno Libre
```
┌─────────────────────┐  ┌─────────────────────┐
│ DEV4 [Ocupado 🔴]   │  │ TEST4  [Libre 🟢]   │
│                     │  │                     │
│ 📝 feature/abc-123  │  │ ✓ Disponible        │
│ 👤 Juan Pérez       │  │                     │
│ 📅 02/02 14:30      │  │ [🚀 Desplegar]      │
│                     │  │                     │
│ [🔓 Liberar]        │  └─────────────────────┘
└─────────────────────┘
```

### Estado 4: Ambos Ocupados
```
┌─────────────────────┐  ┌─────────────────────┐
│ DEV4 [Ocupado 🔴]   │  │ TEST4 [Ocupado 🔴]  │
│                     │  │                     │
│ 📝 feature/abc-123  │  │ 📝 integration/v2   │
│ 👤 Juan Pérez       │  │ 👤 María González   │
│ 📅 02/02 14:30      │  │ 📅 02/02 15:00      │
│                     │  │                     │
│ [🔓 Liberar]        │  │ [🔓 Liberar]        │
└─────────────────────┘  └─────────────────────┘
```

## 🔔 Notificaciones Slack

### Formato: Ambiente Ocupado
```
🚀 Ambiente dev4 ocupado con la rama feature/nueva-funcionalidad por Juan Pérez.
```

### Formato: Ambiente Liberado
```
✅ Ambiente test4 ha sido liberado y está disponible para despliegue.
```

### Ejemplo en canal
```
#dev-notifications
─────────────────────────────────────────
Admin Environments Bot  BOT  2:30 PM
🚀 Ambiente dev4 ocupado con la rama 
feature/nueva-funcionalidad por Juan Pérez.
─────────────────────────────────────────
Admin Environments Bot  BOT  4:15 PM
✅ Ambiente dev4 ha sido liberado y está 
disponible para despliegue.
─────────────────────────────────────────
```

## 📱 Interfaz Responsive

### Desktop (> 768px)
```
┌─────────────────────────────────────────────────┐
│         🚀 Admin Ambientes - Dev4 & Test4       │
│    Gestión de ambientes de desarrollo          │
│                                                 │
│  ┌────────────────────┐  ┌────────────────────┐│
│  │      DEV4          │  │       TEST4        ││
│  │   [Card Grande]    │  │   [Card Grande]    ││
│  │                    │  │                    ││
│  └────────────────────┘  └────────────────────┘│
│                                                 │
│             [🔄 Actualizar]                     │
└─────────────────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────────┐
│  🚀 Admin Ambientes  │
│                      │
│ ┌──────────────────┐ │
│ │      DEV4        │ │
│ │   [Card Full]    │ │
│ │                  │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │      TEST4       │ │
│ │   [Card Full]    │ │
│ │                  │ │
│ └──────────────────┘ │
│                      │
│   [🔄 Actualizar]    │
└──────────────────────┘
```

## 🎭 Diálogo de Despliegue

```
┌────────────────────────────────────────┐
│ 🚀 Desplegar en dev4                   │
├────────────────────────────────────────┤
│                                        │
│ Completa la información para ocupar    │
│ el ambiente dev4                       │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 🌿 Nombre de la Rama               │ │
│ │ [feature/nueva-funcionalidad    ] │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 👤 Tu Nombre                       │ │
│ │ [Juan Pérez                     ] │ │
│ └────────────────────────────────────┘ │
│                                        │
├────────────────────────────────────────┤
│              [Cancelar]  [✓ Desplegar] │
└────────────────────────────────────────┘
```

## 📊 Gráfico de Componentes Angular

```
AppComponent (Root)
    │
    └── DashboardComponent
            │
            ├── [ngFor] EnvironmentCard x2
            │       │
            │       ├── MatCard
            │       ├── MatChip (status)
            │       └── MatButton (actions)
            │
            ├── MatProgressSpinner (loading)
            │
            ├── MatDialog → DeployDialogComponent
            │       │
            │       ├── MatFormField (branch)
            │       ├── MatFormField (user)
            │       └── MatDialogActions
            │
            └── MatFab (refresh button)
```

## 🔗 Endpoints API REST

```
┌─────────────────────────────────────────────────────────┐
│                    BASE URL                             │
│              http://localhost:3000                      │
└─────────────────────────────────────────────────────────┘

GET    /health
       → Status del servidor

GET    /api/environments
       → Lista todos los ambientes

GET    /api/environments/:name
       → Obtiene ambiente específico (dev4 o test4)

POST   /api/environments/init
       → Inicializa ambientes en BD

POST   /api/environments/:name/deploy
       Body: { branch, deployedBy }
       → Despliega rama (ocupa ambiente)

POST   /api/environments/:name/release
       → Libera ambiente
```

## 🎨 Paleta de Colores

```css
/* Primary Colors */
--primary-blue: #1976d2;
--accent-color: #ff5722;

/* Status Colors */
--libre-color: #4caf50;   /* Verde */
--ocupado-color: #ff5722; /* Rojo/Naranja */

/* UI Colors */
--background: #f5f5f5;
--card-bg: #ffffff;
--text-primary: #333333;
--text-secondary: #666666;
--text-muted: #999999;

/* Borders */
--border-libre: 5px solid #4caf50;
--border-ocupado: 5px solid #ff5722;
```

## 🚦 Estados del Sistema

```
┌───────────┐
│  Inicial  │ → App carga
└─────┬─────┘
      │
      ▼
┌───────────┐
│  Loading  │ → Fetching data
└─────┬─────┘
      │
      ├──────────────────┐
      │                  │
      ▼                  ▼
┌────────────┐    ┌─────────────┐
│   Loaded   │    │    Error    │
│  (Success) │    │  (Failed)   │
└─────┬──────┘    └─────────────┘
      │
      ├─────────────────────┐
      │                     │
      ▼                     ▼
┌────────────┐      ┌──────────────┐
│   Libre    │      │   Ocupado    │
└────┬───────┘      └──────┬───────┘
     │                     │
     │ Deploy              │ Release
     └─────────────────────┘
```

---

📌 **Nota:** Esta guía visual te ayuda a entender rápidamente cómo está estructurado el proyecto y cómo fluyen los datos.
