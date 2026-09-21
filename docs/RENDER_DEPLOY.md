# 🚀 Despliegue en Render (Backend)

Este archivo configura el despliegue del backend en Render.

## Pasos para desplegar en Render

### 1. Crear cuenta en Render
Ve a https://render.com y crea una cuenta (puedes usar GitHub)

### 2. Crear nuevo Web Service

- Click en **"New +"** → **"Web Service"**
- Conecta tu repositorio Git o selecciona **"Public Git Repository"**
- Usa esta URL: `<tu-repo-url>` (o sube el código a GitHub primero)

### 3. Configuración del Web Service

**Build Settings:**
- **Name**: `admin-environments-backend`
- **Region**: `Oregon (US West)` o el más cercano
- **Branch**: `main` o `master`
- **Root Directory**: `backend` (NO `backend/src`)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Pricing:**
- Selecciona **Free** tier (si está disponible) o **Starter** ($7/mes)

### 4. Variables de Entorno

En la sección **"Environment"**, agrega:

```
MONGODB_URI=mongodb+srv://frpatino6Coffe:s4ntiago@mycoffecluster.yerjpro.mongodb.net/environment-algo
DNS_SERVERS=8.8.8.8,1.1.1.1
PORT=3000
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
NODE_ENV=production
```

### 5. Deploy

Click en **"Create Web Service"**

Render automáticamente:
- Clonará el repositorio
- Instalará dependencias
- Iniciará el servidor

### 6. Obtener URL

Después del deploy exitoso, Render te dará una URL como:
```
https://admin-environments.onrender.com
```

### 7. Actualizar Frontend

Edita `frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://admin-environments.onrender.com/api'
};
```

### 8. Re-compilar y Desplegar Frontend

```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

---

## ⚠️ Nota sobre el Free Tier

El tier gratuito de Render:
- ✅ Es completamente gratis
- ⚠️ El servidor "duerme" después de 15 minutos de inactividad
- ⚠️ Primera petición después de dormir toma ~30 segundos

Para evitar esto:
- Usa el plan **Starter** ($7/mes) - servidor siempre activo
- O configura un cron job externo que haga ping cada 10 minutos

---

## 🔧 CORS Configuration

El backend ya está configurado para CORS. Si necesitas restringir orígenes, edita `backend/server.js`:

```javascript
const allowedOrigins = [
  'http://localhost:4200',
  'https://admin-environments.web.app',
  'https://admin-environments.firebaseapp.com'
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

## 📊 Monitoreo

### Ver logs en tiempo real

En el dashboard de Render:
1. Ve a tu servicio
2. Click en **"Logs"** en la barra lateral
3. Verás logs en tiempo real

### Health Check

Render automáticamente verifica:
```
GET https://admin-environments.onrender.com/health
```

Si el endpoint no responde, Render reinicia el servicio.

---

## 🔄 Auto-Deploy

Si conectaste un repositorio Git:
- Cada push a la rama principal despliega automáticamente
- Render ejecuta `npm install` y `node server.js`

---

## 💰 Costos

**Free Tier:**
- 750 horas/mes (suficiente para 1 servicio 24/7)
- Servidor duerme después de inactividad
- 0 costo

**Starter ($7/mes):**
- Servidor siempre activo
- Sin límite de horas
- Mejor para producción

---

## 🆘 Solución de Problemas

### Error: "Cannot find module"
- Verifica que `package.json` esté en `/backend`
- Build Command debe ser: `npm install`

### Base de datos no conecta
- Verifica `MONGODB_URI` en variables de entorno
- Agrega `DNS_SERVERS=8.8.8.8,1.1.1.1` en Render
- Asegúrate que MongoDB Atlas permite conexiones desde `0.0.0.0/0`

### CORS Errors
- Agrega la URL de Firebase Hosting al array `allowedOrigins`
- Redespliega el backend

---

## 📚 Recursos

- [Render Docs](https://render.com/docs)
- [Node.js Deployment Guide](https://render.com/docs/deploy-node-express-app)
