# 🌐 Guía de Despliegue en la Nube

## Opciones de Despliegue

### Frontend (Angular)
- ✅ **Firebase Hosting** (Recomendado) - Gratis, rápido, CDN global
- Vercel
- Netlify

### Backend (Node.js + Express)
- **Railway** - Fácil, $5/mes, sin configuración
- **Render** - Free tier disponible, fácil setup
- **Firebase Cloud Functions** - Requiere refactorización
- **Google Cloud Run** - Requiere Docker
- **Heroku** - $5-7/mes

---

## 🔥 Opción 1: Firebase Hosting (Frontend) + Railway (Backend)

Esta es la opción más sencilla y rápida.

### A. Desplegar Frontend en Firebase Hosting

#### 1. Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

#### 2. Login en Firebase

```bash
firebase login
```

#### 3. Inicializar proyecto (desde la raíz)

```bash
firebase init hosting
```

Responde:
- **"Use an existing project"** → Selecciona tu proyecto
- **"What do you want to use as your public directory?"** → `frontend/dist/admin-environments-frontend/browser`
- **"Configure as a single-page app?"** → `Yes`
- **"Set up automatic builds and deploys with GitHub?"** → `No` (por ahora)

#### 4. Compilar frontend para producción

```bash
cd frontend
npm run build
```

#### 5. Actualizar firebase.json

Edita `firebase.json` en la raíz:

```json
{
  "hosting": {
    "public": "frontend/dist/admin-environments-frontend/browser",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/api/**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          }
        ]
      }
    ]
  }
}
```

#### 6. Desplegar

```bash
firebase deploy --only hosting
```

Tu frontend estará en: `https://<tu-proyecto>.web.app`

---

### B. Desplegar Backend en Railway

#### 1. Crear cuenta en Railway

Ve a https://railway.app y crea una cuenta (puedes usar GitHub)

#### 2. Instalar Railway CLI

```bash
npm install -g @railway/cli
```

#### 3. Login

```bash
railway login
```

#### 4. Crear proyecto (desde backend/)

```bash
cd backend
railway init
```

#### 5. Configurar variables de entorno

```bash
railway variables set MONGODB_URI="mongodb+srv://frpatino6Coffe:s4ntiago@mycoffecluster.yerjpro.mongodb.net/environment-algo"
railway variables set PORT=3000
railway variables set SLACK_WEBHOOK_URL="<tu-webhook-url>"
railway variables set NODE_ENV="production"
```

#### 6. Crear railway.json

Crea `backend/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 7. Desplegar

```bash
railway up
```

Railway te dará una URL tipo: `https://admin-environments-production.up.railway.app`

#### 8. Actualizar frontend con la URL del backend

Edita `frontend/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://admin-environments-production.up.railway.app'
};
```

Recompila y redespliega el frontend:

```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

---

## 🔥 Opción 2: Todo en Firebase (Functions + Hosting)

Requiere refactorizar el backend a Cloud Functions.

### 1. Inicializar Functions

```bash
firebase init functions
```

### 2. Migrar backend a functions

Esto requiere adaptar el código Express. ¿Te interesa esta opción?

---

## 🚀 Opción 3: Render (Backend Gratuito)

Render ofrece tier gratuito para el backend.

### 1. Crear cuenta en Render

Ve a https://render.com

### 2. Crear Web Service

- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && node server.js`
- **Environment Variables**:
  - `MONGODB_URI`
  - `SLACK_WEBHOOK_URL`
  - `PORT=3000`

### 3. Conectar repositorio Git

Render auto-despliega cuando haces push.

---

## 📋 Checklist Post-Despliegue

- [ ] Backend responde en `/health`
- [ ] Frontend carga correctamente
- [ ] Dashboard muestra los ambientes
- [ ] Desplegar rama funciona
- [ ] Liberar ambiente funciona
- [ ] Notificaciones de Slack llegan
- [ ] CORS configurado correctamente
- [ ] Variables de entorno en producción

---

## 🔧 Configuración de CORS para Producción

Edita `backend/server.js`:

```javascript
const allowedOrigins = [
  'http://localhost:4200',
  'https://<tu-proyecto>.web.app',
  'https://<tu-proyecto>.firebaseapp.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
```

---

## 💡 Recomendación

Para empezar rápido:
1. **Frontend** → Firebase Hosting (gratuito, 10GB almacenamiento)
2. **Backend** → Railway ($5/mes con $5 de crédito inicial)
3. **Base de Datos** → MongoDB Atlas (ya configurado)

Total: Prácticamente **gratuito el primer mes**, luego $5/mes.

---

## 🆘 Solución de Problemas

### Error de CORS
- Verifica que el backend tiene la URL del frontend en allowedOrigins
- Revisa que el frontend tiene la URL correcta del backend

### Frontend no carga
- Verifica que compilaste con `npm run build`
- Revisa la configuración de rewrites en firebase.json

### Backend no responde
- Verifica las variables de entorno
- Revisa los logs: `railway logs` o panel de Render

---

## 📚 Recursos

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
