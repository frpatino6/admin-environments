# Admin Environments - Backend

Backend API para gestión de ambientes dev4 y test4.

## Instalación

```bash
npm install
```

## Configuración

1. Copia `.env.example` a `.env`
2. Configura tu Slack Webhook URL en el archivo `.env`

## Ejecución

```bash
# Desarrollo con nodemon
npm run dev

# Producción
npm start
```

## API Endpoints

### Obtener todos los ambientes
```
GET /api/environments
```

### Obtener un ambiente específico
```
GET /api/environments/:name
```

### Desplegar rama (ocupar ambiente)
```
POST /api/environments/:name/deploy
Body: {
  "branch": "feature/nueva-funcionalidad",
  "deployedBy": "Juan Pérez"
}
```

### Liberar ambiente
```
POST /api/environments/:name/release
```

### Inicializar ambientes
```
POST /api/environments/init
```

## Estructura

```
backend/
├── config/
│   └── db.js              # Configuración MongoDB
├── models/
│   └── Environment.js     # Modelo de datos
├── routes/
│   └── environments.js    # Rutas API
├── services/
│   └── slackService.js    # Servicio de notificaciones Slack
├── .env                   # Variables de entorno
├── .gitignore
├── package.json
└── server.js              # Servidor principal
```
