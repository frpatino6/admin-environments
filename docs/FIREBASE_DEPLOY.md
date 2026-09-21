# 🚀 Guía de Despliegue en Firebase

## ✅ Refactor Completado

El proyecto ha sido refactorizado para Firebase:
- ✅ Backend adaptado a Cloud Functions
- ✅ Frontend configurado para producción
- ✅ Archivos de configuración creados

---

## 📋 Pasos para Desplegar

### 1. Instalar Firebase CLI (si no la tienes)

```powershell
npm install -g firebase-tools
```

### 2. Login en Firebase

```powershell
firebase login
```

Esto abrirá tu navegador para autenticarte.

### 3. Seleccionar tu Proyecto Firebase

Edita `.firebaserc` y cambia `"admin-environments"` por el ID de tu proyecto:

```json
{
  "projects": {
    "default": "tu-proyecto-id"
  }
}
```

**Para ver tus proyectos:**
```powershell
firebase projects:list
```

### 4. Instalar Dependencias de Functions

```powershell
cd functions
C:\ProgramData\nvm\v20.20.0\npm.cmd install
cd ..
```

### 5. Configurar Variables de Entorno en Firebase

```powershell
firebase functions:config:set mongodb.uri="mongodb+srv://frpatino6Coffe:s4ntiago@mycoffecluster.yerjpro.mongodb.net/environment-algo"
firebase functions:config:set slack.webhook="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### 6. Compilar el Frontend

```powershell
cd frontend
C:\ProgramData\nvm\v20.20.0\npm.cmd run build
cd ..
```

### 7. Desplegar a Firebase

**Opción A - Desplegar todo (Functions + Hosting):**
```powershell
firebase deploy
```

**Opción B - Desplegar solo Hosting (frontend):**
```powershell
firebase deploy --only hosting
```

**Opción C - Desplegar solo Functions (backend):**
```powershell
firebase deploy --only functions
```

### 8. Obtener la URL de tu Cloud Function

Después del deploy, Firebase te dará una URL como:
```
https://us-central1-tu-proyecto.cloudfunctions.net/api
```

### 9. Actualizar URL del Backend en el Frontend

Edita `frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://us-central1-TU-PROYECTO.cloudfunctions.net/api/api'
};
```

**Nota:** La URL termina en `/api/api` porque:
- Primera `/api` es el nombre de la función
- Segunda `/api` es el prefijo de las rutas en Express

### 10. Re-compilar y Re-desplegar Frontend

```powershell
cd frontend
C:\ProgramData\nvm\v20.20.0\npm.cmd run build
cd ..
firebase deploy --only hosting
```

---

## 🌐 URLs Finales

Después del despliegue tendrás:

- **Frontend:** `https://tu-proyecto.web.app`
- **Backend API:** `https://REGION-tu-proyecto.cloudfunctions.net/api`

---

## ✅ Verificar el Despliegue

### 1. Probar el Backend

```powershell
curl "https://REGION-tu-proyecto.cloudfunctions.net/api/health"
```

Debería responder:
```json
{"status":"OK","message":"Server is running on Firebase Functions"}
```

### 2. Probar el Frontend

Abre en el navegador: `https://tu-proyecto.web.app`

---

## 🔧 Solución de Problemas

### Error: "Cannot find module 'firebase-functions'"

```powershell
cd functions
npm install
```

### Error de CORS

Las Cloud Functions ya tienen CORS habilitado con `origin: true` en `functions/index.js`.

### Frontend no conecta con Backend

1. Verifica que `environment.ts` tiene la URL correcta
2. Verifica que la URL termina en `/api/api`
3. Abre DevTools → Network para ver los errores

### Variables de entorno no funcionan

```powershell
# Ver configuración actual
firebase functions:config:get

# Establecer de nuevo
firebase functions:config:set mongodb.uri="tu-uri"

# Re-desplegar
firebase deploy --only functions
```

---

## 📊 Monitoreo

### Ver logs de Cloud Functions

```powershell
firebase functions:log
```

### Ver logs en tiempo real

```powershell
firebase functions:log --only api
```

### Dashboard de Firebase

Ve a https://console.firebase.google.com/project/tu-proyecto/functions

---

## 💰 Costos

**Firebase Spark (Gratis):**
- Hosting: 10 GB almacenamiento, 10 GB/mes transferencia
- Functions: 2M invocaciones/mes, 400K GB-seg, 200K CPU-seg

**Para este proyecto:**
- Uso estimado: **GRATIS** (menos de 1000 peticiones/día)
- Si superas el tier gratuito: ~$0.40 por 1M de invocaciones adicionales

---

## 🔄 Updates Futuros

Para actualizar la aplicación:

1. Hacer cambios en el código
2. Re-compilar frontend: `npm run build` (en frontend/)
3. Desplegar: `firebase deploy`

---

## 📚 Recursos

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
