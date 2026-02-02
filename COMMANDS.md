# 📝 Comandos Rápidos - Admin Environments

## 🚀 Inicio Rápido

### Windows PowerShell
```powershell
# Iniciar ambos servidores automáticamente
.\start.ps1
```

### Linux/Mac Bash
```bash
# Dar permisos de ejecución
chmod +x start.sh

# Iniciar
./start.sh
```

## 📦 Instalación

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## ▶️ Ejecución

### Backend (Desarrollo)
```bash
cd backend
npm run dev                    # Con nodemon (auto-reload)
npm start                      # Sin auto-reload
```

### Frontend (Desarrollo)
```bash
cd frontend
npm start                      # Servidor dev en http://localhost:4200
npm run watch                  # Build con watch mode
```

### Frontend (Producción)
```bash
cd frontend
npm run build                  # Output en dist/
```

## 🔧 API - Comandos cURL

### Health Check
```bash
curl http://localhost:3000/health
```

### Obtener ambientes
```bash
# Todos los ambientes
curl http://localhost:3000/api/environments

# Solo dev4
curl http://localhost:3000/api/environments/dev4

# Solo test4
curl http://localhost:3000/api/environments/test4
```

### Inicializar ambientes (primera vez)
```bash
curl -X POST http://localhost:3000/api/environments/init
```

### Desplegar rama
```bash
# En dev4
curl -X POST http://localhost:3000/api/environments/dev4/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "feature/mi-rama",
    "deployedBy": "Tu Nombre"
  }'

# En test4
curl -X POST http://localhost:3000/api/environments/test4/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "integration/sprint-1",
    "deployedBy": "Tu Nombre"
  }'
```

### Liberar ambiente
```bash
# Liberar dev4
curl -X POST http://localhost:3000/api/environments/dev4/release

# Liberar test4
curl -X POST http://localhost:3000/api/environments/test4/release
```

## 🔧 PowerShell Equivalentes

### Desplegar rama (PowerShell)
```powershell
# Dev4
$body = @{
    branch = "feature/mi-rama"
    deployedBy = "Tu Nombre"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/environments/dev4/deploy" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Liberar ambiente (PowerShell)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/environments/dev4/release" `
  -Method POST `
  -ContentType "application/json"
```

### Obtener ambientes (PowerShell)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/environments" | ConvertTo-Json
```

## 🐛 Debugging

### Ver logs del backend
```bash
cd backend
npm run dev
# Los logs aparecerán en la consola
```

### Ver errores del frontend
```bash
# Abrir DevTools del navegador
F12 o Ctrl+Shift+I

# Ver tab Console para errores JavaScript
# Ver tab Network para errores HTTP
```

### Limpiar caché y reinstalar
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json .angular
npm install
```

## 🗄️ MongoDB

### Conectar con MongoDB Compass
```
Connection String:
mongodb+srv://frpatino6Coffe:s4ntiago@mycoffecluster.yerjpro.mongodb.net/environment-algo
```

### Ver datos con mongo shell
```bash
mongosh "mongodb+srv://frpatino6Coffe:s4ntiago@mycoffecluster.yerjpro.mongodb.net/environment-algo"

# Comandos útiles
show dbs
use environment-algo
show collections
db.environments.find()
db.environments.find({name: "dev4"})
```

## 🧪 Testing

### Probar Slack Webhook
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🧪 Prueba de webhook"}' \
  YOUR_SLACK_WEBHOOK_URL
```

### Verificar conexión MongoDB
```bash
# Desde backend
node -e "require('./config/db')().then(() => console.log('✅ Conectado')).catch(e => console.error('❌', e))"
```

## 🔄 Git

### Inicializar repositorio
```bash
cd d:\GitFlyr\admin-environments
git init
git add .
git commit -m "Initial commit: Admin Environments application"
```

### Crear .gitignore adicional
```bash
# Ya existe .gitignore en la raíz
# Verifica que incluye:
node_modules/
dist/
.env
*.log
.DS_Store
.angular/
```

## 📊 VS Code Tasks

### Ejecutar con tareas de VS Code
```
Ctrl+Shift+P
> Tasks: Run Task
> Selecciona:
  - Start Backend
  - Start Frontend
  - Start All (ambos)
  - Install Backend
  - Install Frontend
  - Build Frontend
```

### Atajos de teclado recomendados
```json
// Agregar a keybindings.json (Ctrl+K Ctrl+S)
[
  {
    "key": "ctrl+alt+b",
    "command": "workbench.action.tasks.runTask",
    "args": "Start Backend"
  },
  {
    "key": "ctrl+alt+f",
    "command": "workbench.action.tasks.runTask",
    "args": "Start Frontend"
  },
  {
    "key": "ctrl+alt+a",
    "command": "workbench.action.tasks.runTask",
    "args": "Start All"
  }
]
```

## 🛑 Detener Servidores

### Linux/Mac
```bash
# Encontrar procesos
ps aux | grep node

# Matar proceso por PID
kill -9 <PID>

# O usar pkill
pkill -f "node.*backend"
pkill -f "node.*frontend"
```

### Windows
```powershell
# Encontrar procesos en puertos
netstat -ano | findstr :3000
netstat -ano | findstr :4200

# Matar proceso por PID
taskkill /PID <PID> /F

# Matar todos los procesos de Node.js
taskkill /IM node.exe /F
```

## 🔧 Troubleshooting Rápido

### "Port already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### "Cannot find module"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### "MongoDB connection error"
```bash
# Verificar internet
ping google.com

# Verificar connection string en .env
cat backend/.env | grep MONGODB_URI
```

### "Angular CLI not found"
```bash
# Instalar globalmente
npm install -g @angular/cli@latest

# O usar npx
npx ng serve
```

## 📝 Variables de Entorno

### Editar .env del backend
```bash
# Windows
notepad backend\.env

# Linux/Mac
nano backend/.env
vim backend/.env
```

### Variables disponibles
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
PORT=3000
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## 🎯 Comandos por Escenario

### Primer uso
```bash
# 1. Actualizar Node.js a v20+
node --version

# 2. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 3. Configurar .env
notepad backend\.env

# 4. Iniciar backend
cd backend && npm run dev

# 5. Inicializar DB (en otra terminal)
curl -X POST http://localhost:3000/api/environments/init

# 6. Iniciar frontend (en otra terminal)
cd frontend && npm start

# 7. Abrir navegador
start http://localhost:4200
```

### Uso diario
```bash
# Opción A: Script
.\start.ps1

# Opción B: VS Code Task
# Ctrl+Shift+P > Tasks: Run Task > Start All

# Opción C: Manual
cd backend && npm run dev    # Terminal 1
cd frontend && npm start     # Terminal 2
```

### Después de pull
```bash
# Actualizar dependencias si cambiaron
cd backend && npm install
cd frontend && npm install

# Reiniciar servidores
```

## 📞 Ayuda

### Ver ayuda de npm scripts
```bash
npm run
```

### Ver versiones
```bash
node --version
npm --version
ng version        # Angular CLI
```

### Logs detallados
```bash
# Backend con logs verbose
DEBUG=* npm run dev

# Frontend con logs
ng serve --verbose
```

---

💡 **Tip:** Guarda este archivo en favoritos para acceso rápido a comandos comunes.
