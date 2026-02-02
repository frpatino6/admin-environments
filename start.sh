#!/bin/bash
# Script para iniciar la aplicación completa

echo "🚀 Iniciando Admin Environments..."
echo ""

# Verificar Node.js
NODE_VERSION=$(node -v)
echo "📦 Node.js version: $NODE_VERSION"
echo ""

# Iniciar Backend
echo "🔧 Iniciando Backend..."
cd backend
npm run dev &
BACKEND_PID=$!
echo "✅ Backend corriendo en PID: $BACKEND_PID"
cd ..

# Esperar 3 segundos
sleep 3

# Iniciar Frontend
echo "🎨 Iniciando Frontend..."
cd frontend
npm start &
FRONTEND_PID=$!
echo "✅ Frontend corriendo en PID: $FRONTEND_PID"
cd ..

echo ""
echo "✅ Aplicación iniciada exitosamente!"
echo ""
echo "📍 URLs:"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:4200"
echo ""
echo "🛑 Para detener, presiona Ctrl+C"
echo ""

# Mantener el script corriendo
wait
