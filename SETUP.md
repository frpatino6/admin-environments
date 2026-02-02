# Guía de Configuración Rápida - Admin Environments

## ⚡ Setup en 5 minutos

### 1. Actualizar Node.js (IMPORTANTE)

Tu versión actual es v12.22.12 - **necesitas actualizar** a v20.19+ o v22.x

**Opción A - Usando nvm (recomendado):**
```bash
# Instalar nvm desde: https://github.com/coreybutler/nvm-windows
nvm install 22
nvm use 22
node --version  # Debe mostrar v22.x.x
```

**Opción B - Instalador directo:**
- Descarga desde: https://nodejs.org/
- Instala la versión LTS (v22.x)
- Reinicia VS Code

### 2. Instalar Dependencias Backend

```bash
cd backend
npm install
```

### 3. Configurar Slack Webhook

1. Ve a: https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Nombre: "Admin Environments Bot"
4. Selecciona tu workspace
5. En el menú lateral: "Incoming Webhooks"
6. Activa "Activate Incoming Webhooks"
7. Click "Add New Webhook to Workspace"
8. Selecciona el canal (ej: #dev-notifications)
9. Copia la URL del webhook

Edita `backend/.env`:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### 4. Inicializar MongoDB

```bash
cd backend
npm run dev
```

En otra terminal o navegador:
```bash
curl -X POST http://localhost:3000/api/environments/init
```

O visita: http://localhost:3000/api/environments/init

### 5. Instalar Dependencias Frontend

```bash
cd frontend
npm install
```

### 6. Ejecutar la Aplicación

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Abre: http://localhost:4200

## ✅ Verificación

1. Deberías ver dos tarjetas: dev4 y test4
2. Ambos deben mostrar "Libre"
3. Haz click en "Desplegar Rama" en dev4
4. Ingresa una rama y tu nombre
5. Verifica que:
   - La tarjeta muestra "Ocupado"
   - Aparece tu rama y nombre
   - Se envió mensaje a Slack
6. Click en "Liberar Ambiente"
7. Verifica que vuelve a "Libre"

## 🔧 Comandos Útiles

```bash
# Backend - Ver logs en tiempo real
cd backend
npm run dev

# Frontend - Compilar para producción
cd frontend
npm run build

# Verificar estado de ambientes
curl http://localhost:3000/api/environments

# Liberar dev4 manualmente
curl -X POST http://localhost:3000/api/environments/dev4/release
```

## 🚨 Problemas Comunes

**"Module not found" en Angular:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**"Port 3000 already in use":**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Cambiar puerto en backend/.env
PORT=3001
```

**MongoDB no conecta:**
- Verifica internet
- Asegúrate que MongoDB Atlas tiene tu IP en whitelist
- Ve a: https://cloud.mongodb.com/ → Network Access → Add IP Address

**Slack no notifica:**
```bash
# Prueba el webhook manualmente
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"Hola desde Admin Environments!"}' \
TU_SLACK_WEBHOOK_URL
```

## 📞 Soporte

Si tienes problemas:
1. Verifica que Node.js >= v20.19
2. Revisa que todas las dependencias se instalaron sin errores
3. Confirma que backend está corriendo en puerto 3000
4. Abre las DevTools del navegador (F12) para ver errores

---

¡Listo! Ahora tienes tu sistema de gestión de ambientes funcionando. 🎉
